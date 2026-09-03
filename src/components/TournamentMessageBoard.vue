<template>
  <div v-if="isPageReady" class="content-container">
    <md-card class="section-card">
      <md-card-header class="header-ribbon">
        <div class="md-title exchange-home-label">Exchange Home</div>
        <div class="md-title title-select-wrapper">
          <span>{{ tournamentName }}</span>
        </div>
      </md-card-header>

      <md-card-content>
        <div class="back-link-row">
          <span class="link decorated-link" @click="goToExchangeHome">&larr; Back to Exchange Home</span>
        </div>
        <div class="md-title section-heading">Message Board</div>
        <message-board :tournament-id="tournamentId"></message-board>
      </md-card-content>
    </md-card>
  </div>
  <div v-else class="spinner-container">
    <md-progress-spinner class="spinner-primary" md-mode="indeterminate"></md-progress-spinner>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';
import MessageBoard from './MessageBoard.vue';

export default {
  name: "TournamentMessageBoard",
  components: { MessageBoard },
  props: {
    tournamentId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      isPageReady: false,
      tournamentName: ''
    }
  },
  methods: {
    goToExchangeHome() {
      this.$router.push({ name: 'TournamentHome', params: { tournamentId: this.tournamentId } });
    },
    async fetchTournament() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query Tournament($id: ID!) {
            tournament(id: $id) {
              id
              name
            }
          }
        `,
        variables: { id: this.tournamentId }
      });
      this.tournamentName = response.data.tournament.name;
    }
  },
  async created() {
    await this.fetchTournament();
    this.isPageReady = true;
  }
}
</script>

<style scoped>
.section-card {
  margin-bottom: 24px;
}

.header-ribbon {
  background: #474C45;
  border-radius: 4px 4px 0 0;
  padding: 16px 24px !important;
}

.exchange-home-label {
  text-align: center;
  color: #8fe37e;
  margin-bottom: 4px;
}

.title-select-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-weight: bold;
  color: #fff;
}

.back-link-row {
  margin-bottom: 16px;
}

.section-heading {
  margin: 0 0 16px;
}

.spinner-container {
  text-align: center;
  padding: 40px;
}
</style>
