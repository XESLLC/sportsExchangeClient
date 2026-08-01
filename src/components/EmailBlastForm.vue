<template>
  <md-card class="email-blast-form">
    <md-card-header>
      <div class="md-title">Email Tournament Participants</div>
    </md-card-header>

    <md-card-content>
      <md-field>
        <label>Subject</label>
        <md-input v-model="subject"></md-input>
      </md-field>

      <div class="editor-wrapper">
        <vue-editor
          v-model="htmlBody"
          :editorToolbar="toolbar"
          useCustomImageHandler
          @image-added="handleImageAdded"
        ></vue-editor>
      </div>

      <div class="attachments-section">
        <label>Attachments (files, separate from inline images above)</label>
        <input type="file" multiple @change="handleAttachmentPicked" :disabled="uploadingAttachment" />
        <ul class="attachment-list">
          <li v-for="(att, idx) in attachments" :key="att.key">
            {{ att.filename }} ({{ formatBytes(att.size) }})
            <span @click="removeAttachment(idx)"><md-icon class="fa fa-times-circle light link"></md-icon></span>
          </li>
        </ul>
        <div v-if="uploadingAttachment" class="upload-status">Uploading...</div>
      </div>
    </md-card-content>

    <md-card-actions>
      <md-button
        :disabled="!canSend || sending"
        @click="confirmSend"
        class="md-primary md-raised"
        :class="{ 'btn-disabled': !canSend || sending }"
      >
        Send to {{ recipientCount }} Participant{{ recipientCount === 1 ? '' : 's' }}
        <md-progress-spinner v-if="sending" class="btn-spin" :md-diameter="20" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner>
      </md-button>
    </md-card-actions>

    <div v-if="resultInfo" class="result-info text-center">{{ resultInfo }}</div>
    <div v-if="serverError" class="alert-error text-center">
      {{ serverError }}
      <span @click="serverError = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
    </div>

    <md-card-content v-if="pastBlasts && pastBlasts.length > 0" class="history-section">
      <div class="md-subheading">Previously Sent</div>
      <ul>
        <li v-for="blast in pastBlasts" :key="blast.id">
          <strong>{{ blast.subject }}</strong> — {{ formatDate(blast.createdAt) }} — {{ blast.recipientCount }} sent
          <span v-if="blast.failedCount > 0"> ({{ blast.failedCount }} failed)</span>
        </li>
      </ul>
    </md-card-content>
  </md-card>
</template>

<script>
// npm install vue2-editor
import { VueEditor } from 'vue2-editor';
// ADJUST: import your existing apolloClient the same way other components
// in this repo do (e.g. MilestoneForm.vue / Tournament.vue).
import { apolloClient } from '../main';
import gql from 'graphql-tag';

export default {
  name: 'EmailBlastForm',
  components: { VueEditor },
  props: {
    tournamentId: { type: String, required: true },
    // Pass in the tournament's current entry count from the parent
    // (Tournament.vue already loads `entries` for this tournament).
    recipientCount: { type: Number, default: 0 }
  },
  data() {
    return {
      subject: '',
      htmlBody: '',
      attachments: [], // [{ filename, key, size }]
      uploadingAttachment: false,
      sending: false,
      serverError: null,
      resultInfo: null,
      pastBlasts: null,
      toolbar: [
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean']
      ]
    };
  },
  computed: {
    canSend() {
      return this.subject.trim().length > 0 && this.htmlBody.trim().length > 0 && !this.uploadingAttachment;
    }
  },
  async mounted() {
    await this.fetchHistory();
  },
  methods: {
    async getPresignedUpload(file) {
      const response = await apolloClient.mutate({
        mutation: gql`
          mutation GetEmailAttachmentUploadUrl($input: EmailAttachmentUploadInput!) {
            getEmailAttachmentUploadUrl(input: $input) {
              uploadUrl
              key
              publicUrl
            }
          }
        `,
        variables: {
          input: {
            tournamentId: this.tournamentId,
            filename: file.name,
            contentType: file.type
          }
        }
      });
      return response.data.getEmailAttachmentUploadUrl;
    },
    // Fired by vue2-editor when someone inserts an image/gif inline via the
    // toolbar. Uploads straight to S3, then swaps in the public URL so it
    // renders inline in the email body itself.
    async handleImageAdded(file, Editor, cursorLocation, resetUploader) {
      try {
        const { uploadUrl, publicUrl } = await this.getPresignedUpload(file);
        await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
        Editor.insertEmbed(cursorLocation, 'image', publicUrl);
        resetUploader();
      } catch (err) {
        this.serverError = 'Failed to upload image';
      }
    },
    async handleAttachmentPicked(event) {
      const files = Array.from(event.target.files || []);
      this.uploadingAttachment = true;
      try {
        for (const file of files) {
          const { uploadUrl, key } = await this.getPresignedUpload(file);
          await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
          this.attachments.push({ filename: file.name, key, size: file.size });
        }
      } catch (err) {
        this.serverError = 'Failed to upload attachment';
      }
      this.uploadingAttachment = false;
      event.target.value = '';
    },
    removeAttachment(idx) {
      this.attachments.splice(idx, 1);
    },
    confirmSend() {
      if (!confirm(`Send this email to ${this.recipientCount} participant(s)? This can't be undone.`)) {
        return;
      }
      this.sendEmail();
    },
    async sendEmail() {
      this.sending = true;
      this.serverError = null;
      this.resultInfo = null;
      try {
        const response = await apolloClient.mutate({
          fetchPolicy: 'no-cache',
          mutation: gql`
            mutation SendTournamentEmail($input: SendTournamentEmailInput!) {
              sendTournamentEmail(input: $input) {
                id
                recipientCount
                failedCount
                unresolvedParticipants
                status
              }
            }
          `,
          variables: {
            input: {
              tournamentId: this.tournamentId,
              subject: this.subject,
              htmlBody: this.htmlBody,
              attachmentKeys: this.attachments.map((a) => a.key)
            }
          }
        });
        const blast = response.data.sendTournamentEmail;
        let info = `Sent to ${blast.recipientCount} participant(s).`;
        if (blast.failedCount > 0) {
          info += ` ${blast.failedCount} could not be reached.`;
        }
        if (blast.unresolvedParticipants && blast.unresolvedParticipants.length > 0) {
          info += ` Unresolved: ${blast.unresolvedParticipants.join(', ')}.`;
        }
        this.resultInfo = info;
        this.subject = '';
        this.htmlBody = '';
        this.attachments = [];
        await this.fetchHistory();
      } catch (err) {
        if (err.graphQLErrors && err.graphQLErrors.length > 0) {
          this.serverError = err.graphQLErrors[0].message;
        } else {
          this.serverError = 'Failed to send email';
        }
      }
      this.sending = false;
    },
    async fetchHistory() {
      try {
        const response = await apolloClient.query({
          fetchPolicy: 'no-cache',
          query: gql`
            query EmailBlasts($tournamentId: ID!) {
              emailBlasts(tournamentId: $tournamentId) {
                id
                subject
                recipientCount
                failedCount
                createdAt
              }
            }
          `,
          variables: { tournamentId: this.tournamentId }
        });
        this.pastBlasts = response.data.emailBlasts;
      } catch (err) {
        // history is a nice-to-have - don't block the form on it failing
      }
    },
    formatBytes(bytes) {
      if (!bytes) return '0 KB';
      return `${Math.round(bytes / 1024)} KB`;
    },
    formatDate(dateStr) {
      return new Date(dateStr).toLocaleString();
    }
  }
};
</script>

<style scoped>
.editor-wrapper {
  margin: 16px 0;
}
.attachments-section {
  margin: 16px 0;
}
.attachment-list {
  list-style: none;
  padding: 0;
}
.result-info {
  margin-top: 8px;
  color: #2e7d32;
}
.history-section {
  border-top: 1px solid #eee;
  margin-top: 16px;
}
</style>
