<template>
  <div v-if="isPageReady" class="content-container">
    <md-card class="section-card">
      <md-card-header>
        <div class="md-title title-select-wrapper">
          <md-select v-if="activeTournaments.length > 1" :value="tournamentId" @md-selected="switchTournament" class="title-select">
            <md-option v-for="t in activeTournaments" :key="t.id" :value="t.id">
              {{ t.leagueName }} - {{ t.name }}
            </md-option>
          </md-select>
          <span v-else>{{ tournamentName }}</span>
        </div>
      </md-card-header>

      <md-card-content>
        <!-- My Entries -->
        <div v-if="myEntries.length > 0" class="my-entries-section">
          <h3 class="section-heading">My Entries</h3>
          <div class="my-entries-grid">
            <div v-for="entry in myEntries" :key="entry.entryName" class="entry-card">
              <div class="entry-card-name">{{ entry.entryName }}</div>
              <div class="entry-card-rank" v-if="entry.rank">
                #{{ entry.rank }} of {{ totalEntries }}
              </div>
              <div v-if="entry.profitLoss != null" class="entry-card-pl" :class="entry.profitLoss >= 0 ? 'pl-positive' : 'pl-negative'">
                {{ entry.profitLoss | toCurrency }}
              </div>
              <div v-else class="entry-card-pl pl-unavailable">Rankings not yet available</div>
              <md-button class="md-primary md-raised entry-btn" @click="goToPortfolio(entry.entryId)">View Portfolio</md-button>
            </div>
          </div>
        </div>
        <div v-else-if="!rankingsError" class="no-entries">
          You don't have an entry in this tournament yet.
          <md-button class="md-primary md-raised" @click="$emit('create-entry')">Create Entry</md-button>
        </div>
      </md-card-content>
    </md-card>

    <!-- Message Board -->
    <md-card class="section-card">
      <md-card-header>
        <div class="md-title">Message Board</div>
      </md-card-header>
      <md-card-content>
        <message-board :tournament-id="tournamentId"></message-board>
      </md-card-content>
    </md-card>

    <!-- Rankings -->
    <md-card class="section-card">
      <md-card-header>
        <div class="md-title">Rankings</div>
      </md-card-header>
      <md-card-content>
        <div v-if="rankingsError" class="rankings-unavailable">
          Rankings not yet available for this tournament.
        </div>
        <div v-else-if="rankedSummaries.length === 0" class="rankings-unavailable">
          No entries yet.
        </div>
        <div v-else>
          <md-table class="web-table text-left">
            <md-table-row>
              <md-table-head>Rank</md-table-head>
              <md-table-head>Owner</md-table-head>
              <md-table-head>Entry</md-table-head>
              <md-table-head>$ Won to Date</md-table-head>
              <md-table-head>Profit / Loss</md-table-head>
            </md-table-row>
            <md-table-row
              v-for="(summary, index) in rankedSummaries"
              :key="summary.entryName"
              :class="{ 'my-row': isMyEntry(summary.entryName) }"
            >
              <md-table-cell>{{ index + 1 }}</md-table-cell>
              <md-table-cell>{{ summary.ownerName }}</md-table-cell>
              <md-table-cell>{{ summary.entryName }}</md-table-cell>
              <md-table-cell>{{ summary.moneyWonToDate | toCurrency }}</md-table-cell>
              <md-table-cell :class="summary.profitLoss >= 0 ? 'pl-positive' : 'pl-negative'">
                {{ summary.profitLoss | toCurrency }}
              </md-table-cell>
            </md-table-row>
          </md-table>

          <md-table class="mobile-table text-left">
            <md-table-row
              v-for="(summary, index) in rankedSummaries"
              :key="summary.entryName + '-mobile'"
              :class="{ 'my-row': isMyEntry(summary.entryName) }"
            >
              <md-table-cell>
                <div class="mobile-row">
                  <span class="mobile-rank">#{{ index + 1 }}</span>
                  <span class="mobile-entry-name">{{ summary.entryName }}</span>
                  <span class="mobile-owner">{{ summary.ownerName }}</span>
                </div>
                <div class="mobile-row">
                  <span class="mobile-label">Profit/Loss: </span>
                  <span :class="summary.profitLoss >= 0 ? 'pl-positive' : 'pl-negative'">{{ summary.profitLoss | toCurrency }}</span>
                </div>
              </md-table-cell>
            </md-table-row>
          </md-table>
        </div>
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
  name: "TournamentHome",
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
      tournamentName: '',
      rankedSummaries: [],
      myEntries: [],
      totalEntries: 0,
      rankingsError: false,
      myEntryNames: [],
      activeTournaments: []
    }
  },
  watch: {
    async tournamentId() {
      this.isPageReady = false;
      await this.init();
      this.isPageReady = true;
    }
  },
  methods: {
    switchTournament(tournamentId) {
      if (tournamentId !== this.tournamentId) {
        this.$router.push({ name: 'TournamentHome', params: { tournamentId } });
      }
    },
    async fetchActiveTournaments() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query Tournaments {
            tournaments {
              id
              name
              leagueName
              isActive
            }
          }
        `
      });
      this.activeTournaments = response.data.tournaments.filter(t => t.isActive);
    },
    goToPortfolio(entryId) {
      this.$router.push({ name: 'Portfolio', params: { entryId } });
    },
    isMyEntry(entryName) {
      return this.myEntryNames.includes(entryName);
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
    },
    async fetchUserEntries() {
      const email = sessionStorage.getItem('sports-exchange.email');
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query UserEntries($email: String!) {
            userEntries(email: $email) {
              id
              name
              tournamentId
            }
          }
        `,
        variables: { email }
      });
      return response.data.userEntries.filter(e => e.tournamentId === this.tournamentId);
    },
    async fetchRankings() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query PortfolioSummaries($tournamentId: ID!) {
            portfolioSummaries(tournamentId: $tournamentId) {
              ownerName
              entryName
              moneyWonToDate
              profitLoss
            }
          }
        `,
        variables: { tournamentId: this.tournamentId }
      });
      return response.data.portfolioSummaries;
    },
    async init() {
      this.rankingsError = false;
      this.rankedSummaries = [];
      this.myEntries = [];
      this.myEntryNames = [];

      await this.fetchTournament();

      const userEntriesForTournament = await this.fetchUserEntries();
      this.myEntryNames = userEntriesForTournament.map(e => e.name);

      let summaries = [];
      try {
        summaries = await this.fetchRankings();
        summaries = [...summaries].sort((a, b) => b.profitLoss - a.profitLoss);
        this.rankedSummaries = summaries;
        this.totalEntries = summaries.length;
      } catch (err) {
        this.rankingsError = true;
      }

      this.myEntries = userEntriesForTournament.map(userEntry => {
        const idx = summaries.findIndex(s => s.entryName === userEntry.name);
        return {
          entryId: userEntry.id,
          entryName: userEntry.name,
          rank: idx >= 0 ? idx + 1 : null,
          profitLoss: idx >= 0 ? summaries[idx].profitLoss : null
        };
      });
    }
  },
  async created() {
    await this.fetchActiveTournaments();
    await this.init();
    this.isPageReady = true;
  }
}
</script>

<style scoped>
.section-card {
  margin-bottom: 24px;
}

.title-select-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.title-select {
  font-size: inherit;
  font-weight: inherit;
  padding: 0;
  margin: 0;
  min-width: 0;
}

.section-heading {
  margin: 0 0 16px;
  font-size: 1.1em;
  font-weight: bold;
}

.my-entries-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.entry-card {
  border: 2px solid #487233;
  border-radius: 6px;
  padding: 16px 20px;
  min-width: 200px;
  text-align: center;
}

.entry-card-name {
  font-weight: bold;
  font-size: 1.05em;
  margin-bottom: 6px;
}

.entry-card-rank {
  color: #555;
  font-size: 0.9em;
  margin-bottom: 4px;
}

.entry-card-pl {
  font-size: 1.2em;
  font-weight: bold;
  margin-bottom: 12px;
}

.entry-btn {
  margin: 0;
}

.pl-positive {
  color: #24E22C;
}

.pl-negative {
  color: #e53935;
}

.pl-unavailable {
  color: #999;
  font-size: 0.85em;
  font-weight: normal;
}

.no-entries {
  padding: 8px 0;
  color: #555;
}

.rankings-unavailable {
  color: #777;
  padding: 8px 0;
}

.my-row td {
  background-color: #f0f9ee;
  font-weight: bold;
}

.spinner-container {
  text-align: center;
  padding: 40px;
}

.web-table {
  display: block;
}

.mobile-table {
  display: none;
}

.mobile-row {
  padding: 2px 0;
}

.mobile-rank {
  font-weight: bold;
  margin-right: 8px;
}

.mobile-entry-name {
  font-weight: bold;
  margin-right: 8px;
}

.mobile-owner {
  color: #555;
  font-size: 0.9em;
}

.mobile-label {
  color: #555;
}

@media screen and (max-width: 720px) {
  .web-table {
    display: none;
  }
  .mobile-table {
    display: block;
  }
}
</style>
