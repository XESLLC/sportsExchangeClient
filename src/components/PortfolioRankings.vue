<template>
  <div v-if="isPageReady">
    <h2>Portfolio Rankings</h2>

    <div class="table-wrapper">
      <table class="rankings-table">
        <thead>
          <tr>
            <th class="col-rank">Rank</th>
            <th class="col-owner sortable" @click="sortBy('ownerName')">Owner <span class="sort-icon">{{ sortIcon('ownerName') }}</span></th>
            <th class="col-entry sortable" @click="sortBy('entryName')">Entry Name <span class="sort-icon">{{ sortIcon('entryName') }}</span></th>
            <th class="sortable" @click="sortBy('totalInitialInvestment')">Total $ IPO Investment <span class="sort-icon">{{ sortIcon('totalInitialInvestment') }}</span></th>
            <th class="sortable" @click="sortBy('totalInitialStocksOwned')">Total IPO Shares Purchased <span class="sort-icon">{{ sortIcon('totalInitialStocksOwned') }}</span></th>
            <th class="sortable" @click="sortBy('totalCurrentStocksOwned')">Total Current Shares Owned <span class="sort-icon">{{ sortIcon('totalCurrentStocksOwned') }}</span></th>
            <th class="sortable" @click="sortBy('totalCurrentTeamsOwned')">Current Teams Owned <span class="sort-icon">{{ sortIcon('totalCurrentTeamsOwned') }}</span></th>
            <th class="sortable" @click="sortBy('moneyWonToDate')">$ Won to Date <span class="sort-icon">{{ sortIcon('moneyWonToDate') }}</span></th>
            <th class="sortable" @click="sortBy('percentMoneyWonInvested')">Won % Money Invested <span class="sort-icon">{{ sortIcon('percentMoneyWonInvested') }}</span></th>
            <th class="sortable" @click="sortBy('profitLoss')">Profit/Loss <span class="sort-icon">{{ sortIcon('profitLoss') }}</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in sortedSummaries" :key="item.entryName" class="link" @click="showRankDetailModal = true; selectedEntry = item">
            <td class="col-rank">{{ index + 1 }}</td>
            <td class="col-owner">{{ item.ownerName }}</td>
            <td class="col-entry">{{ item.entryName }}</td>
            <td>{{ item.totalInitialInvestment | toCurrency }}</td>
            <td>{{ item.totalInitialStocksOwned }}</td>
            <td>{{ item.totalCurrentStocksOwned }}</td>
            <td>{{ item.totalCurrentTeamsOwned }}</td>
            <td>{{ item.moneyWonToDate | toCurrency }}</td>
            <td>{{ item.percentMoneyWonInvested.toFixed(2) }}%</td>
            <td>{{ item.profitLoss | toCurrency }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <md-dialog v-if="showRankDetailModal && selectedEntry" :md-active.sync="showRankDetailModal">
      <md-dialog-title class="text-center">{{selectedEntry.entryName}}</md-dialog-title>
      <md-dialog-content>
        <div class="section">
          <div class="section-header">Owner</div>
          <div>{{selectedEntry.ownerName}}</div>
        </div>
        <div class="section">
          <div class="section-header">Total $ IPO Investment</div>
          <div>{{selectedEntry.totalInitialInvestment | toCurrency}}</div>
        </div>
        <div class="section">
          <div class="section-header">Total Initial Stocks Owned</div>
          <div>{{selectedEntry.totalInitialStocksOwned}}</div>
        </div>
        <div class="section">
          <div class="section-header">Total Current Stocks Owned</div>
          <div>{{selectedEntry.totalCurrentStocksOwned}}</div>
        </div>
        <div class="section">
          <div class="section-header">Total Current Teams Owned</div>
          <div>{{selectedEntry.totalCurrentTeamsOwned}}</div>
        </div>
        <div class="section">
          <div class="section-header">$ Won to Date</div>
          <div>{{selectedEntry.moneyWonToDate | toCurrency}}</div>
        </div>
        <div class="section">
          <div class="section-header">Won % Money Invested</div>
          <div>{{selectedEntry.percentMoneyWonInvested.toFixed(2)}}</div>
        </div>
        <div class="section">
          <div class="section-header">Profit/Loss</div>
          <div>{{selectedEntry.profitLoss | toCurrency}}</div>
        </div>
        <div class="section">
          <div class="section-header">Stock Holdings</div>
          <div v-if="selectedEntryHoldings.length === 0" class="no-holdings">No shares currently owned.</div>
          <table v-else class="holdings-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Shares Owned</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="holding in selectedEntryHoldings" :key="holding.tournamentTeamId" :class="{ eliminated: holding.isEliminated }">
                <td>{{ holding.teamName }}</td>
                <td>{{ holding.shares }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </md-dialog-content>

      <md-card-actions>
        <md-button @click="showRankDetailModal = false, selectedEntry = null" class="md-primary md-raised">
          Close
        </md-button>
      </md-card-actions>
    </md-dialog>
  </div>
  <div v-else>
    <md-progress-spinner class="spinner-primary" md-mode="indeterminate"></md-progress-spinner>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';

export default {
  name: "PortfolioRankings",
  data() {
    return {
      isPageReady: false,
      showRankDetailModal: false,
      selectedEntry: null,
      portfolioSummaries: [],
      teams: [],
      sharesByEntryId: {},
      sortField: 'percentMoneyWonInvested',
      sortOrder: 'desc'
    }
  },
  computed: {
    sortedSummaries() {
      return [...this.portfolioSummaries].sort((a, b) => {
        const aVal = a[this.sortField];
        const bVal = b[this.sortField];
        const dir = this.sortOrder === 'asc' ? 1 : -1;
        if (typeof aVal === 'string') {
          return dir * aVal.localeCompare(bVal);
        }
        return dir * (aVal - bVal);
      });
    },
    selectedEntryHoldings() {
      if (!this.selectedEntry) return [];
      const shares = this.sharesByEntryId[this.selectedEntry.entryId] || {};
      return this.teams
        .filter(team => shares[team.tournamentTeamId] > 0)
        .map(team => ({
          tournamentTeamId: team.tournamentTeamId,
          teamName: team.teamName,
          isEliminated: team.isEliminated,
          shares: shares[team.tournamentTeamId]
        }))
        .sort((a, b) => b.shares - a.shares || a.teamName.localeCompare(b.teamName));
    }
  },
  props: {
    entryId: {
      type: String
    },
    tournamentId: {
      type: String
    }
  },
  watch: {
    async tournamentId(newVal, oldVal) {
      if(newVal && newVal !== oldVal) {
        await this.init();
      }
    }
  },
  methods: {
    sortBy(field) {
      if (this.sortField === field) {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortOrder = 'desc';
      }
    },
    sortIcon(field) {
      if (this.sortField !== field) return '⇅';
      return this.sortOrder === 'asc' ? '▲' : '▼';
    },
    async fetchOwnership() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query TournamentOwnership($tournamentId: ID!) {
            tournamentOwnership(tournamentId: $tournamentId) {
              teams {
                tournamentTeamId
                teamName
                isEliminated
                totalShares
              }
              portfolios {
                entryId
                holdings {
                  tournamentTeamId
                  shares
                }
              }
            }
          }
        `,
        variables: { tournamentId: this.tournamentId }
      });

      const data = response.data.tournamentOwnership;
      this.teams = data.teams;

      const sharesByEntryId = {};
      data.portfolios.forEach(p => {
        const row = {};
        p.holdings.forEach(h => { row[h.tournamentTeamId] = h.shares; });
        sharesByEntryId[p.entryId] = row;
      });
      this.sharesByEntryId = sharesByEntryId;
    },
    async init() {
      const [summariesResponse] = await Promise.all([
        apolloClient.query({
          fetchPolicy: 'no-cache',
          query: gql`
            query PortfolioSummaries($tournamentId: ID!) {
              portfolioSummaries(tournamentId: $tournamentId) {
                entryId,
                ownerName,
                entryName,
                totalInitialInvestment,
                totalInitialStocksOwned,
                totalCurrentStocksOwned,
                totalCurrentTeamsOwned,
                moneyWonToDate,
                percentMoneyWonInvested,
                profitLoss
              }
            }
          `,
          variables: { tournamentId: this.tournamentId }
        }),
        this.fetchOwnership()
      ]);
      this.portfolioSummaries = summariesResponse.data.portfolioSummaries;
    }
  },
  async created() {
    await this.init();
    this.isPageReady = true;
  }
}
</script>

<style scoped>
.total {
  font-weight: bold;
}

.add-to-stock-link {
  line-height: 4;
}

.section {
  padding-bottom: 10px;
}

.section-header {
  font-weight: bold;
}

.no-holdings {
  color: #777;
}

.holdings-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 4px;
}

.holdings-table th,
.holdings-table td {
  padding: 4px 8px;
  text-align: left;
  border-bottom: 1px solid rgba(0, 0, 0, .12);
}

.holdings-table .eliminated td {
  text-decoration: line-through;
  color: #999;
}

.table-wrapper {
  overflow: auto;
  max-height: calc(100vh - 220px);
  border: 1px solid rgba(0, 0, 0, .12);
}

.rankings-table {
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
}

.rankings-table th,
.rankings-table td {
  padding: 8px 16px;
  text-align: left;
  border-bottom: 1px solid rgba(0, 0, 0, .12);
}

.rankings-table td {
  white-space: nowrap;
}

/* Sticky header */
.rankings-table thead th {
  position: sticky;
  top: 0;
  background: #f5f5f5;
  z-index: 2;
  font-size: 12px;
  font-weight: 500;
  /* Let header labels wrap onto multiple lines instead of forcing the
     column wider than the (much shorter) numbers in the rows below. */
  white-space: normal;
  max-width: 110px;
}

.rankings-table .sortable {
  cursor: pointer;
  user-select: none;
}

.rankings-table .sortable:hover {
  background: #ebebeb;
}

.sort-icon {
  font-size: 10px;
  color: #888;
  margin-left: 4px;
}

/* Frozen col 1: Rank */
.rankings-table .col-rank {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #fff;
  min-width: 55px;
  width: 55px;
}

/* Frozen col 2: Owner */
.rankings-table .col-owner {
  position: sticky;
  left: 55px;
  z-index: 2;
  background: #fff;
  min-width: 140px;
  width: 140px;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Frozen col 3: Entry Name */
.rankings-table .col-entry {
  position: sticky;
  left: 195px;
  z-index: 2;
  background: #fff;
  min-width: 160px;
  width: 160px;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  border-right: 2px solid #ddd;
}

/* Header frozen cells need highest z-index (both sticky axes), and should
   stay single-line/ellipsized like their data cells rather than wrap. */
.rankings-table thead .col-rank,
.rankings-table thead .col-owner,
.rankings-table thead .col-entry {
  z-index: 4;
  background: #f5f5f5;
  white-space: nowrap;
}

/* Hover highlight */
.rankings-table tbody tr:hover td {
  background: #f9f9f9;
}

/* Keep frozen cells visible on hover */
.rankings-table tbody tr:hover .col-rank,
.rankings-table tbody tr:hover .col-owner,
.rankings-table tbody tr:hover .col-entry {
  background: #f0f0f0;
}

/* On small screens the frozen columns consume almost the full viewport width,
   leaving no room to see the scrollable columns. Unfreeze them so the table
   just scrolls freely like a normal wide table. */
@media screen and (max-width: 600px) {
  .rankings-table .col-rank,
  .rankings-table .col-owner,
  .rankings-table .col-entry {
    position: static;
    border-right: none;
  }

  .rankings-table thead .col-rank,
  .rankings-table thead .col-owner,
  .rankings-table thead .col-entry {
    position: sticky;
    top: 0;
    z-index: 2;
  }
}
</style>
