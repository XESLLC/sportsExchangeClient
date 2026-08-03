<template>
  <div v-if="isPageReady">
    <h2>Portfolio Rankings</h2>

    <div class="table-wrapper">
    <md-table md-sort="percentMoneyWonInvested" md-sort-order="desc" v-model="portfolioSummaries">
      <md-table-row class="text-left link" @click="showRankDetailModal = true, selectedEntry = item" slot="md-table-row" slot-scope="{ item, index }">
        <md-table-cell md-label="Rank">{{ index + 1 }}</md-table-cell>
        <md-table-cell md-label="Owner" md-sort-by="ownerName">{{ item.ownerName }}</md-table-cell>
				<md-table-cell md-label="Entry Name" md-sort-by="entryName">{{ item.entryName }}</md-table-cell>
				<md-table-cell md-label="Total $ IPO Investment" md-sort-by="totalInitialInvestment">{{ item.totalInitialInvestment | toCurrency }}</md-table-cell>
				<md-table-cell md-label="Total IPO Shares Purchased" md-sort-by="totalInitialStocksOwned">{{ item.totalInitialStocksOwned }}</md-table-cell>
				<md-table-cell md-label="Total Current Shares Owned" md-sort-by="totalCurrentStocksOwned">{{ item.totalCurrentStocksOwned }}</md-table-cell>
				<md-table-cell md-label="Shares Remaining" md-sort-by="stocksRemaining">{{ item.stocksRemaining }}</md-table-cell>
				<md-table-cell md-label="% Remaining" md-sort-by="percentStocksRemaining">{{ item.percentStocksRemaining.toFixed(2) }}%</md-table-cell>
				<md-table-cell md-label="Current Teams Owned" md-sort-by="totalCurrentTeamsOwned">{{ item.totalCurrentTeamsOwned }}</md-table-cell>
				<md-table-cell md-label="Teams Remaining" md-sort-by="totalCurrentTeamsRemaining">{{ item.totalCurrentTeamsRemaining }}</md-table-cell>
				<md-table-cell md-label="$ Won to Date" md-sort-by="moneyWonToDate">{{ item.moneyWonToDate | toCurrency }}</md-table-cell>
				<md-table-cell md-label="Won % Money Invested" md-sort-by="percentMoneyWonInvested">{{ item.percentMoneyWonInvested.toFixed(2) }}%</md-table-cell>
				<md-table-cell md-label="$ Remaining (At IPO Price)" md-sort-by="originalMoneyRemaining">{{ item.originalMoneyRemaining | toCurrency }}</md-table-cell>
        <md-table-cell md-label="Profit/Loss" md-sort-by="profitLoss">{{ item.profitLoss | toCurrency }}</md-table-cell>
				<md-table-cell md-label="$ Remaining % Money Invested" md-sort-by="percentMoneyRemaining">{{ item.percentMoneyRemaining.toFixed(2) }}%</md-table-cell>
      </md-table-row>
    </md-table>
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
          <div class="section-header">Stocks Remaining</div>
          <div>{{selectedEntry.stocksRemaining}}</div>
        </div>
        <div class="section">
          <div class="section-header">% Stocks Remaining</div>
          <div>{{selectedEntry.percentStocksRemaining.toFixed(2)}}</div>
        </div>
        <div class="section">
          <div class="section-header">Total Current Teams Owned</div>
          <div>{{selectedEntry.totalCurrentTeamsOwned}}</div>
        </div>
        <div class="section">
          <div class="section-header">Total Current Teams Remaining</div>
          <div>{{selectedEntry.totalCurrentTeamsRemaining}}</div>
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
          <div class="section-header">$ Remaining (At IPO Price)</div>
          <div>{{selectedEntry.originalMoneyRemaining | toCurrency}}</div>
        </div>
        <div class="section">
          <div class="section-header">Profit/Loss</div>
          <div>{{selectedEntry.profitLoss | toCurrency}}</div>
        </div>
        <div class="section">
          <div class="section-header">$ Remaining % Money Invested</div>
          <div>{{selectedEntry.percentMoneyRemaining.toFixed(2)}}</div>
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
      portfolioSummaries: []
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
    async init() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query PortfolioSummaries($tournamentId: ID!) {
            portfolioSummaries(tournamentId: $tournamentId) {
              ownerName,
              entryName,
              totalInitialInvestment,
              totalInitialStocksOwned,
              totalCurrentStocksOwned,
              stocksRemaining,
              percentStocksRemaining,
              totalCurrentTeamsOwned,
              totalCurrentTeamsRemaining,
              moneyWonToDate,
              percentMoneyWonInvested,
              originalMoneyRemaining,
              profitLoss,
              percentMoneyRemaining
            }
          }
        `,
        variables: { tournamentId: this.tournamentId }
      });
      this.portfolioSummaries = response.data.portfolioSummaries;
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

.table-wrapper {
  overflow: auto;
  max-height: calc(100vh - 220px);
}

/*
 * vue-material's .md-table and .md-table-content both have overflow-x:auto,
 * which makes them the scroll container instead of our wrapper.
 * Override to visible so .table-wrapper is the single scroll container,
 * which is required for position:sticky to work correctly.
 */
.table-wrapper ::v-deep .md-table,
.table-wrapper ::v-deep .md-table-content {
  overflow: visible;
}

/*
 * border-collapse:collapse prevents position:sticky on td/th in all browsers.
 * Switch to separate and manually restore row borders.
 */
.table-wrapper ::v-deep table {
  border-collapse: separate;
  border-spacing: 0;
}

.table-wrapper ::v-deep tbody .md-table-row td {
  border-top: 1px solid rgba(0, 0, 0, .12);
}

/* Sticky header row */
.table-wrapper ::v-deep thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #fff;
}

/* Frozen col 1: Rank */
.table-wrapper ::v-deep thead th:nth-child(1),
.table-wrapper ::v-deep tbody td:nth-child(1) {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #fff;
  width: 60px;
  min-width: 60px;
  max-width: 60px;
}

/* Frozen col 2: Owner */
.table-wrapper ::v-deep thead th:nth-child(2),
.table-wrapper ::v-deep tbody td:nth-child(2) {
  position: sticky;
  left: 60px;
  z-index: 2;
  background: #fff;
  width: 160px;
  min-width: 160px;
  max-width: 160px;
}

/* Frozen col 3: Entry Name */
.table-wrapper ::v-deep thead th:nth-child(3),
.table-wrapper ::v-deep tbody td:nth-child(3) {
  position: sticky;
  left: 220px;
  z-index: 2;
  background: #fff;
  min-width: 160px;
  border-right: 2px solid #e0e0e0;
}

/* Corner cells (sticky in both axes) need highest z-index */
.table-wrapper ::v-deep thead th:nth-child(1),
.table-wrapper ::v-deep thead th:nth-child(2),
.table-wrapper ::v-deep thead th:nth-child(3) {
  z-index: 4;
}
</style>
