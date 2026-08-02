<template>
  <div class="message-board">
    <div v-if="serverError" class="alert-error text-center">
      {{ serverError }}
      <span @click="serverError = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
    </div>

    <div v-if="!isPageReady" class="text-center">
      <md-progress-spinner class="spinner-primary" md-mode="indeterminate"></md-progress-spinner>
    </div>

    <div v-else>
      <!-- Thread list view -->
      <div v-if="!activeThread">
        <div class="board-actions">
          <md-button class="md-primary md-raised" @click="showNewThreadForm = !showNewThreadForm">
            {{ showNewThreadForm ? 'Cancel' : 'New Thread' }}
          </md-button>
        </div>

        <div v-if="showNewThreadForm" class="new-thread-form">
          <md-field>
            <label>Title</label>
            <md-input v-model="newThreadTitle"></md-input>
          </md-field>
          <md-field>
            <label>Body</label>
            <md-textarea v-model="newThreadBody" md-autogrow></md-textarea>
          </md-field>
          <md-button
            :disabled="postWait || !newThreadTitle.trim() || !newThreadBody.trim()"
            @click="postThread"
            class="md-primary md-raised"
          >
            Post Thread
            <md-progress-spinner v-if="postWait" class="btn-spin" :md-diameter="20" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner>
          </md-button>
        </div>

        <div v-if="threads.length === 0" class="no-threads">
          No posts yet — start a new thread above.
        </div>

        <div v-for="thread in threads" :key="thread.id" class="thread-row link" @click="openThread(thread)">
          <div class="thread-title">{{ thread.title }}</div>
          <div class="thread-meta">
            {{ thread.authorFirstName }} {{ thread.authorLastName }}
            <span v-if="thread.entryName"> ({{ thread.entryName }})</span>
            &middot; {{ getReadableDate(thread.createdAt) }}
            &middot; {{ thread.replies.length }} {{ thread.replies.length === 1 ? 'reply' : 'replies' }}
          </div>
        </div>
      </div>

      <!-- Thread detail view -->
      <div v-else>
        <div class="back-btn" @click="closeThread">
          <md-icon class="fa fa-angle-left link"></md-icon>
          <span class="link">Back to threads</span>
        </div>

        <!-- Original post -->
        <div class="post op">
          <div class="post-title">{{ activeThread.title }}</div>
          <div class="post-meta">
            {{ activeThread.authorFirstName }} {{ activeThread.authorLastName }}
            <span v-if="activeThread.entryName"> ({{ activeThread.entryName }})</span>
            &middot; {{ getReadableDate(activeThread.createdAt) }}
          </div>
          <div class="post-body">{{ activeThread.body }}</div>
        </div>

        <!-- Replies -->
        <div v-if="activeThread.replies.length > 0" class="replies-section">
          <div v-for="reply in activeThread.replies" :key="reply.id" class="post reply">
            <div class="post-meta">
              {{ reply.authorFirstName }} {{ reply.authorLastName }}
              <span v-if="reply.entryName"> ({{ reply.entryName }})</span>
              &middot; {{ getReadableDate(reply.createdAt) }}
            </div>
            <div class="post-body">{{ reply.body }}</div>
          </div>
        </div>
        <div v-else class="no-replies">No replies yet.</div>

        <!-- Reply form -->
        <div class="reply-form">
          <md-field>
            <label>Write a reply</label>
            <md-textarea v-model="replyBody" md-autogrow></md-textarea>
          </md-field>
          <md-button
            :disabled="postWait || !replyBody.trim()"
            @click="postReply"
            class="md-primary md-raised"
          >
            Post Reply
            <md-progress-spinner v-if="postWait" class="btn-spin" :md-diameter="20" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner>
          </md-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';

const MESSAGES_QUERY = gql`
  query TournamentMessages($tournamentId: ID!) {
    tournamentMessages(tournamentId: $tournamentId) {
      id
      entryName
      authorFirstName
      authorLastName
      title
      body
      notifiedByEmail
      createdAt
      replies {
        id
        entryName
        authorFirstName
        authorLastName
        body
        createdAt
      }
    }
  }
`;

export default {
  name: "MessageBoard",
  data() {
    return {
      isPageReady: false,
      threads: [],
      activeThread: null,
      showNewThreadForm: false,
      newThreadTitle: '',
      newThreadBody: '',
      replyBody: '',
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
    async fetchThreads() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: MESSAGES_QUERY,
        variables: { tournamentId: this.tournamentId }
      });
      this.threads = [...response.data.tournamentMessages].reverse();
    },
    openThread(thread) {
      this.activeThread = thread;
      this.replyBody = '';
    },
    closeThread() {
      this.activeThread = null;
    },
    async postThread() {
      const title = this.newThreadTitle.trim();
      const body = this.newThreadBody.trim();
      if (!title || !body) return;

      this.postWait = true;
      this.serverError = null;
      try {
        await apolloClient.mutate({
          mutation: gql`
            mutation CreateTournamentMessage($input: CreateTournamentMessageInput!) {
              createTournamentMessage(input: $input) { id }
            }
          `,
          variables: { input: { tournamentId: this.tournamentId, title, body } }
        });
        this.newThreadTitle = '';
        this.newThreadBody = '';
        this.showNewThreadForm = false;
        await this.fetchThreads();
      } catch (err) {
        this.serverError = err.graphQLErrors?.[0]?.message || 'Failed to post thread';
      }
      this.postWait = false;
    },
    async postReply() {
      const body = this.replyBody.trim();
      if (!body || !this.activeThread) return;

      this.postWait = true;
      this.serverError = null;
      try {
        await apolloClient.mutate({
          mutation: gql`
            mutation CreateTournamentMessage($input: CreateTournamentMessageInput!) {
              createTournamentMessage(input: $input) { id }
            }
          `,
          variables: { input: { tournamentId: this.tournamentId, body, parentId: this.activeThread.id } }
        });
        this.replyBody = '';
        await this.fetchThreads();
        // Refresh the active thread with updated replies
        this.activeThread = this.threads.find(t => t.id === this.activeThread.id) || null;
      } catch (err) {
        this.serverError = err.graphQLErrors?.[0]?.message || 'Failed to post reply';
      }
      this.postWait = false;
    },
    getReadableDate(dateString) {
      return new Date(dateString).toLocaleString();
    }
  },
  async created() {
    try {
      await this.fetchThreads();
    } catch (err) {
      this.serverError = err.graphQLErrors?.[0]?.message || 'Failed to load message board';
    }
    this.isPageReady = true;
  }
}
</script>

<style scoped>
.board-actions {
  margin-bottom: 12px;
}

.new-thread-form {
  background: #f9f9f9;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.no-threads,
.no-replies {
  color: #777;
  padding: 12px 0;
}

.thread-row {
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.thread-row:hover {
  background: #f5f5f5;
}

.thread-title {
  font-weight: bold;
  font-size: 1em;
}

.thread-meta {
  font-size: 0.82em;
  color: #777;
  margin-top: 2px;
}

.back-btn {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-bottom: 16px;
  gap: 4px;
}

.post {
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.post.op {
  margin-bottom: 8px;
}

.post-title {
  font-weight: bold;
  font-size: 1.1em;
  margin-bottom: 4px;
}

.post-meta {
  font-size: 0.82em;
  color: #777;
  margin-bottom: 6px;
}

.post-body {
  white-space: pre-wrap;
}

.reply {
  padding-left: 16px;
  border-left: 3px solid #ddd;
  margin-top: 8px;
}

.replies-section {
  margin-bottom: 16px;
}

.reply-form {
  margin-top: 16px;
}

.btn-spin {
  margin-left: 8px;
}
</style>
