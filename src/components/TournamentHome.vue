<template>
  <div v-if="isPageReady" class="content-container">
    <md-card class="section-card">
      <md-card-header class="header-ribbon">
        <div class="md-title exchange-home-label">Exchange Home</div>
        <div class="md-title title-select-wrapper">
          <span>{{ tournamentName }}</span>
        </div>
        <div v-if="activeTournaments.length > 1" class="exchange-switcher">
          <span v-if="!showExchangeSwitcher" class="link decorated-link switch-exchange-link" @click="showExchangeSwitcher = true">Switch Exchange</span>
          <div v-else class="exchange-switcher-list">
            <div
              v-for="t in activeTournaments"
              :key="t.id"
              class="exchange-switcher-item link"
              @click="switchTournament(t.id)"
            >
              {{ t.leagueName }} - {{ t.name }}
            </div>
            <span class="link decorated-link switch-exchange-link" @click="showExchangeSwitcher = false">Cancel</span>
          </div>
        </div>
      </md-card-header>

      <md-card-content>
        <!-- My Entries -->
        <div v-if="myEntries.length > 0" class="my-entries-section">
          <div class="md-title section-heading">My Entries</div>
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

        <div class="all-ownership-link-row">
          <span class="link decorated-link all-ownership-link" @click="goToOwnership">View All Stock Ownership &rarr;</span>
        </div>
      </md-card-content>
    </md-card>

    <!-- Transactions -->
    <md-card v-if="myEntries.length > 0" class="section-card">
      <md-card-header>
        <div class="md-title">Transactions</div>
      </md-card-header>
      <md-card-content>
        <div v-if="transactionsError" class="rankings-unavailable">
          Transaction history not available right now.
        </div>
        <div v-else-if="recentTransactions.length === 0" class="rankings-unavailable">
          No buy, sell, or trade activity yet.
        </div>
        <div v-else class="transactions-list">
          <div v-for="t in recentTransactions" :key="t.id" class="transaction-row">
            <span class="transaction-type" :class="'type-' + t.type.toLowerCase()">{{ t.type }}</span>
            <span class="transaction-detail">
              {{ t.quantity }} share{{ t.quantity === 1 ? '' : 's' }} of {{ t.teamName }}
              <span v-if="t.cost > 0"> for {{ t.cost | toCurrency }}</span>
            </span>
            <span class="transaction-date">{{ t.date.toLocaleDateString() }}</span>
          </div>
        </div>
        <div class="bid-offer-link-row">
          <md-button class="md-primary md-raised" @click="goToBidOrOffer">Place a Bid / Make an Offer</md-button>
        </div>
      </md-card-content>
    </md-card>

    <!-- Message Board -->
    <md-card class="section-card">
      <md-card-header>
        <div class="md-title">Message Board</div>
      </md-card-header>
      <md-card-content>
        <message-board :tournament-id="tournamentId" :preview-count="2"></message-board>
      </md-card-content>
    </md-card>

    <!-- Total Pot -->
    <md-card class="section-card">
      <md-card-header>
        <div class="md-title">Total Pot</div>
      </md-card-header>
      <md-card-content>
        <div class="total-pot-amount">{{ totalPot | toCurrency }}</div>
        <div class="pot-ownership-link-row text-center">
          <span class="link decorated-link all-ownership-link" @click="goToOwnership">View All Stock Ownership &rarr;</span>
        </div>

        <div v-if="teamInvestments.length" class="team-investment">
          <div class="md-subheading team-investment-heading">Invested by Team</div>

          <md-table class="web-table text-left">
            <md-table-row>
              <md-table-head class="sortable" @click.native="sortInvestments('teamName')">Team <span class="sort-icon">{{ investmentSortIcon('teamName') }}</span></md-table-head>
              <md-table-head class="sortable" @click.native="sortInvestments('myShares')">My Shares <span class="sort-icon">{{ investmentSortIcon('myShares') }}</span></md-table-head>
              <md-table-head class="sortable" @click.native="sortInvestments('percentOfTotalShares')">% of Total Shares <span class="sort-icon">{{ investmentSortIcon('percentOfTotalShares') }}</span></md-table-head>
              <md-table-head class="sortable" @click.native="sortInvestments('totalShares')">Total Shares <span class="sort-icon">{{ investmentSortIcon('totalShares') }}</span></md-table-head>
              <md-table-head class="sortable" @click.native="sortInvestments('invested')">Total Invested <span class="sort-icon">{{ investmentSortIcon('invested') }}</span></md-table-head>
              <md-table-head class="sortable" @click.native="sortInvestments('percentOfPot')">% of Pot <span class="sort-icon">{{ investmentSortIcon('percentOfPot') }}</span></md-table-head>
            </md-table-row>
            <md-table-row v-for="row in sortedTeamInvestments" :key="row.teamName">
              <md-table-cell>{{ row.teamName }}</md-table-cell>
              <md-table-cell>{{ row.myShares }}</md-table-cell>
              <md-table-cell>{{ row.percentOfTotalShares }}%</md-table-cell>
              <md-table-cell>{{ row.totalShares }}</md-table-cell>
              <md-table-cell>{{ row.invested | toCurrency }}</md-table-cell>
              <md-table-cell>{{ row.percentOfPot }}%</md-table-cell>
            </md-table-row>
            <md-table-row class="totals-row">
              <md-table-cell>Total</md-table-cell>
              <md-table-cell>{{ totalMyShares }}</md-table-cell>
              <md-table-cell>{{ totalPercentOfTotalShares }}%</md-table-cell>
              <md-table-cell>{{ totalShares }}</md-table-cell>
              <md-table-cell>{{ totalInvested | toCurrency }}</md-table-cell>
              <md-table-cell>100%</md-table-cell>
            </md-table-row>
          </md-table>

          <md-table class="mobile-table text-left">
            <md-table-row v-for="row in sortedTeamInvestments" :key="row.teamName + '-mobile'">
              <md-table-cell>
                <div class="mobile-row">
                  <span class="mobile-team-name">{{ row.teamName }}</span>
                  <span class="mobile-invested">{{ row.invested | toCurrency }}</span>
                </div>
                <div class="mobile-row mobile-sub">
                  <span>{{ row.myShares }} my shares</span>
                  <span>{{ row.percentOfTotalShares }}% of total shares</span>
                </div>
                <div class="mobile-row mobile-sub">
                  <span>{{ row.totalShares }} total shares</span>
                  <span>{{ row.percentOfPot }}% of pot</span>
                </div>
              </md-table-cell>
            </md-table-row>
            <md-table-row class="totals-row">
              <md-table-cell>
                <div class="mobile-row">
                  <span class="mobile-team-name">Total</span>
                  <span class="mobile-invested">{{ totalInvested | toCurrency }}</span>
                </div>
                <div class="mobile-row mobile-sub">
                  <span>{{ totalMyShares }} my shares</span>
                  <span>{{ totalPercentOfTotalShares }}% of total shares</span>
                </div>
                <div class="mobile-row mobile-sub">
                  <span>{{ totalShares }} total shares</span>
                  <span>100% of pot</span>
                </div>
              </md-table-cell>
            </md-table-row>
          </md-table>
        </div>
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
      totalPot: 0,
      teamInvestments: [],
      totalShares: 0,
      totalMyShares: 0,
      totalPercentOfTotalShares: 0,
      totalInvested: 0,
      rankedSummaries: [],
      myEntries: [],
      totalEntries: 0,
      recentTransactions: [],
      transactionsError: false,
      rankingsError: false,
      myEntryNames: [],
      activeTournaments: [],
      showExchangeSwitcher: false,
      investmentSortField: 'invested',
      investmentSortOrder: 'desc'
    }
  },
  watch: {
    async tournamentId() {
      this.isPageReady = false;
      this.showExchangeSwitcher = false;
      await this.init();
      this.isPageReady = true;
    }
  },
  computed: {
    sortedTeamInvestments() {
      const field = this.investmentSortField;
      const dir = this.investmentSortOrder === 'asc' ? 1 : -1;
      return [...this.teamInvestments].sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        if (typeof aVal === 'string') {
          return aVal.localeCompare(bVal) * dir;
        }
        return (aVal - bVal) * dir;
      });
    }
  },
  methods: {
    sortInvestments(field) {
      if (this.investmentSortField === field) {
        this.investmentSortOrder = this.investmentSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        this.investmentSortField = field;
        this.investmentSortOrder = field === 'teamName' ? 'asc' : 'desc';
      }
    },
    investmentSortIcon(field) {
      if (this.investmentSortField !== field) return '⇅';
      return this.investmentSortOrder === 'asc' ? '▲' : '▼';
    },
    switchTournament(tournamentId) {
      this.showExchangeSwitcher = false;
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
              status
            }
          }
        `
      });
      this.activeTournaments = response.data.tournaments.filter(t => t.status !== 'inactive');
    },
    goToPortfolio(entryId) {
      this.$router.push({ name: 'Portfolio', params: { entryId } });
    },
    goToOwnership() {
      this.$router.push({ name: 'TournamentOwnership', params: { tournamentId: this.tournamentId } });
    },
    goToBidOrOffer() {
      const params = this.myEntries.length === 1 ? { entryId: this.myEntries[0].entryId } : {};
      this.$router.push({ name: 'Transactions', params });
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
              totalPot
            }
          }
        `,
        variables: { id: this.tournamentId }
      });
      this.tournamentName = response.data.tournament.name;
      this.totalPot = response.data.tournament.totalPot;
    },
    async fetchTeamInvestments() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query TournamentTeams($tournamentId: ID!) {
            tournamentTeams(tournamentId: $tournamentId) {
              id
              teamName
              ipoPrice
              stocksPurchased
            }
          }
        `,
        variables: { tournamentId: this.tournamentId }
      });
      return response.data.tournamentTeams;
    },
    // Sums shares owned per team across every entry the current user
    // owns in this tournament (usually one, but co-owned/multi-entry
    // players can have more).
    async fetchMyShares(entryIds) {
      if (!entryIds || entryIds.length === 0) {
        return {};
      }
      const responses = await Promise.all(entryIds.map(entryId =>
        apolloClient.query({
          fetchPolicy: 'no-cache',
          query: gql`
            query StocksByEntryId($entryId: ID!) {
              stocksByEntryId(entryId: $entryId) {
                tournamentTeamId
                quantity
              }
            }
          `,
          variables: { entryId }
        })
      ));
      const sharesByTeamId = {};
      responses.forEach((response) => {
        (response.data.stocksByEntryId || []).forEach((stock) => {
          sharesByTeamId[stock.tournamentTeamId] = (sharesByTeamId[stock.tournamentTeamId] || 0) + stock.quantity;
        });
      });
      return sharesByTeamId;
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
    // Tournament-wide, like fetchRankings below - filtered down to the
    // current user's entries client-side (see init()).
    async fetchTransactions() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query GetTournamentTransactions($tournamentId: ID!) {
            getTournamentTransactions(tournamentId: $tournamentId) {
              id
              groupId
              entry { id }
              teamName
              quantity
              cost
              createdAt
            }
          }
        `,
        variables: { tournamentId: this.tournamentId }
      });
      return response.data.getTournamentTransactions;
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
      this.recentTransactions = [];
      this.transactionsError = false;
      this.teamInvestments = [];
      this.totalShares = 0;
      this.totalMyShares = 0;
      this.totalPercentOfTotalShares = 0;
      this.totalInvested = 0;

      await this.fetchTournament();

      const userEntriesForTournament = await this.fetchUserEntries();
      this.myEntryNames = userEntriesForTournament.map(e => e.name);
      const myEntryIds = userEntriesForTournament.map(e => e.id);

      try {
        const [teams, myShares] = await Promise.all([
          this.fetchTeamInvestments(),
          this.fetchMyShares(myEntryIds)
        ]);
        const rows = teams.map(t => {
          const totalTeamShares = t.stocksPurchased || 0;
          const myTeamShares = myShares[t.id] || 0;
          return {
            teamName: t.teamName,
            totalShares: totalTeamShares,
            myShares: myTeamShares,
            percentOfTotalShares: totalTeamShares > 0
              ? Math.round((myTeamShares / totalTeamShares) * 1000) / 10
              : 0,
            invested: totalTeamShares * t.ipoPrice
          };
        });
        const totalInvested = rows.reduce((sum, r) => sum + r.invested, 0);
        // Display order comes from sortedTeamInvestments (user-sortable);
        // this array's own order doesn't matter.
        rows.forEach(r => {
          r.percentOfPot = totalInvested > 0
            ? Math.round((r.invested / totalInvested) * 1000) / 10
            : 0;
        });
        this.teamInvestments = rows;
        this.totalShares = rows.reduce((sum, r) => sum + r.totalShares, 0);
        this.totalMyShares = rows.reduce((sum, r) => sum + r.myShares, 0);
        this.totalPercentOfTotalShares = this.totalShares > 0
          ? Math.round((this.totalMyShares / this.totalShares) * 1000) / 10
          : 0;
        this.totalInvested = totalInvested;
      } catch (err) {
        this.teamInvestments = [];
      }

      try {
        const allTransactions = await this.fetchTransactions();
        // A trade's two legs (one per entry) share a groupId; a solo
        // IPO buy or secondary-market sell doesn't, so this is how we
        // tell "Traded" apart from "Bought"/"Sold" below.
        const entryIdsByGroup = new Map();
        allTransactions.forEach(t => {
          if (!entryIdsByGroup.has(t.groupId)) entryIdsByGroup.set(t.groupId, new Set());
          if (t.entry) entryIdsByGroup.get(t.groupId).add(t.entry.id);
        });
        const myEntryIdSet = new Set(myEntryIds);
        this.recentTransactions = allTransactions
          .filter(t => t.entry && myEntryIdSet.has(t.entry.id))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 6)
          .map(t => {
            const isTrade = (entryIdsByGroup.get(t.groupId) || new Set()).size > 1;
            const type = isTrade ? 'Traded' : (t.cost > 0 ? 'Bought' : (t.cost < 0 ? 'Sold' : 'Adjusted'));
            return {
              id: t.id,
              date: new Date(t.createdAt),
              teamName: t.teamName,
              type,
              quantity: t.quantity,
              cost: Math.abs(t.cost)
            };
          });
      } catch (err) {
        this.recentTransactions = [];
        this.transactionsError = true;
      }

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

.exchange-switcher {
  text-align: center;
  margin-top: 6px;
}

.switch-exchange-link {
  color: #8fe37e;
  font-size: 0.85em;
  font-weight: 600;
}

.switch-exchange-link:hover {
  color: #b9f0ae;
}

.exchange-switcher-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.exchange-switcher-item {
  color: #fff;
  font-size: 0.9em;
  cursor: pointer;
}

.exchange-switcher-item:hover {
  color: #8fe37e;
}

.section-heading {
  margin: 0 0 16px;
}

.total-pot-amount {
  text-align: center;
  font-size: 2.2em;
  font-weight: bold;
  color: #24E22C;
  padding: 8px 0;
}

.team-investment {
  margin-top: 16px;
}

.team-investment .mobile-row {
  display: flex;
  justify-content: space-between;
}

.team-investment-heading {
  margin: 0 0 8px;
  font-weight: bold;
}

.team-investment .sortable {
  cursor: pointer;
  user-select: none;
}

.team-investment .sortable:hover {
  background: #ebebeb;
}

.team-investment .sort-icon {
  font-size: 10px;
  color: #888;
  margin-left: 4px;
}

.totals-row td {
  font-weight: bold;
  border-top: 2px solid #487233;
}

.mobile-team-name {
  font-weight: bold;
  margin-right: 8px;
}

.mobile-invested {
  font-weight: bold;
}

.mobile-sub {
  color: #555;
  font-size: 0.9em;
}

.mobile-sub span {
  margin-right: 12px;
}

.all-ownership-link-row {
  margin-top: 16px;
}

.pot-ownership-link-row {
  margin-top: 8px;
}

.all-ownership-link {
  font-weight: 600;
  font-size: 1.15em;
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

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.transaction-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #eee;
}

.transaction-type {
  font-weight: bold;
  min-width: 60px;
}

.type-bought {
  color: #24E22C;
}

.type-sold {
  color: #e53935;
}

.type-traded {
  color: #487233;
}

.type-adjusted {
  color: #888;
}

.transaction-detail {
  flex: 1;
  color: #333;
}

.transaction-date {
  color: #999;
  font-size: 0.85em;
}

.bid-offer-link-row {
  margin-top: 16px;
  text-align: center;
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
