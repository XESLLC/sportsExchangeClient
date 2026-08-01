<template>
  <div class="message-board">
    <div v-if="serverError" class="alert-error text-center">
      {{serverError}}
      <span @click="serverError = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
    </div>

    <div v-if="!isPageReady" class="text-center">
      <md-progress-spinner class="spinner-primary" md-mode="indeterminate"></md-progress-spinner>
    </div>

    <div v-else>
      <div class="message-list">
        <div v-if="messages.length < 1" class="text-center no-messages">
          No posts yet - be the first to post.
        </div>
        <div v-for="message in messages" :key="message.id" class="message-item">
          <div class="message-meta">
            <strong>{{message.authorFirstName}} {{message.authorLastName}}</strong>
            <span v-if="message.entryName" class="message-entry-name"> ({{message.entryName}})</span>
            <span class="message-timestamp"> - {{getReadableDate(message.createdAt)}}</span>
            <md-icon v-if="message.notifiedByEmail" title="Emailed to all entrants" class="fas fa-envelope message-email-icon"></md-icon>
          </div>
          <div class="message-body">{{message.body}}</div>
        </div>
      </div>

      <md-field class="message-input-field">
        <label>Post a message</label>
        <md-textarea v-model="newMessageBody" md-autogrow></md-textarea>
      </md-field>

      <div class="message-post-actions">
        <md-checkbox v-model="sendEmailOnPost">Email all entrants about this post</md-checkbox>
        <md-button :disabled="postWait || !newMessageBody.trim()" @click="postMessage" class="md-primary md-raised" :class="{ 'btn-disabled' : postWait || !newMessageBody.trim() }">
          Post Message
          <md-progress-spinner v-if="postWait" class="btn-spin" :md-diameter="20" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner>
        </md-button>
      </div>
    </div>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';

export default {
  name: "MessageBoard",
  data() {
    return {
      isPageReady: false,
      messages: [],
      newMessageBody: '',
      sendEmailOnPost: false,
      postWait: false,
      serverError: null
    }
  },
  props: {
    tournamentId: {
      type: String
    }
  },
  methods: {
    async fetchMessages() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query TournamentMessages($tournamentId: ID!) {
            tournamentMessages(tournamentId: $tournamentId) {
              id,
              entryName,
              authorFirstName,
              authorLastName,
              body,
              notifiedByEmail,
              createdAt
            }
          }
        `,
        variables: {
          tournamentId: this.tournamentId
        }
      });

      this.messages = response.data.tournamentMessages;
    },
    async postMessage() {
      const trimmed = this.newMessageBody.trim();
      if (!trimmed) { return; }

      this.postWait = true;
      this.serverError = null;
      try {
        await apolloClient.mutate({
          fetchPolicy: 'no-cache',
          mutation: gql`
            mutation CreateTournamentMessage($input: CreateTournamentMessageInput!) {
              createTournamentMessage(input: $input) {
                id
              }
            }
          `,
          variables: {
            input: {
              tournamentId: this.tournamentId,
              body: trimmed,
              sendEmail: this.sendEmailOnPost
            }
          }
        });

        this.newMessageBody = '';
        this.sendEmailOnPost = false;
        await this.fetchMessages();
      } catch(err) {
        if(err.graphQLErrors && err.graphQLErrors.length > 0) {
          this.serverError = err.graphQLErrors[0].message;
        } else {
          this.serverError = "Failed to post message";
        }
      }
      this.postWait = false;
    },
    getReadableDate(dateString) {
      return new Date(dateString).toLocaleString();
    }
  },
  async created() {
    try {
      await this.fetchMessages();
    } catch(err) {
      if(err.graphQLErrors && err.graphQLErrors.length > 0) {
        this.serverError = err.graphQLErrors[0].message;
      } else {
        this.serverError = "Failed to load message board";
      }
    }
    this.isPageReady = true;
  }
}
</script>

<style scoped>
  .message-list {
    max-height: 400px;
    overflow-y: auto;
    text-align: left;
    margin-bottom: 16px;
  }

  .no-messages {
    color: #777;
    padding: 12px 0;
  }

  .message-item {
    padding: 8px 0;
    border-bottom: 1px solid #eee;
  }

  .message-meta {
    font-size: 0.85em;
    color: #555;
  }

  .message-entry-name {
    color: #777;
  }

  .message-timestamp {
    color: #999;
  }

  .message-email-icon {
    font-size: 12px !important;
    height: 12px !important;
    width: 12px !important;
    margin-left: 6px;
    color: #999;
  }

  .message-body {
    white-space: pre-wrap;
    margin-top: 2px;
  }

  .message-input-field {
    text-align: left;
  }

  .message-post-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
</style>
