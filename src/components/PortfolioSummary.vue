<template>
  <div v-if="isPageReady">
    <h2>Investment Metrics</h2>
    <div v-if="errorMessage" class="alert-error text-center">
      {{errorMessage}}
      <span @click="errorMessage = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
    </div>
    <md-table>
      <md-table-row>
        <md-table-cell class="text-left">Total $ IPO Investment</md-table-cell>
        <md-table-cell>{{portfolioSummary.totalInitialInvestment | toCurrency}}</md-table-cell>
      </md-table-row>

      <md-table-row>
        <md-table-cell class="text-left">Total $ Invested</md-table-cell>
        <md-table-cell>{{portfolioSummary.totalCashInvested | toCurrency}}</md-table-cell>
      </md-table-row>

      <md-table-row>
        <md-table-cell class="text-left">Total Initial Stocks Owned</md-table-cell>
        <md-table-cell>{{portfolioSummary.totalInitialStocksOwned}}</md-table-cell>
      </md-table-row>

      <md-table-row>
        <md-table-cell class="text-left">Total Current Stocks Owned</md-table-cell>
        <md-table-cell>{{portfolioSummary.totalCurrentStocksOwned}}</md-table-cell>
      </md-table-row>

      <md-table-row>
        <md-table-cell class="text-left">Stocks Remaining</md-table-cell>
        <md-table-cell>{{portfolioSummary.stocksRemaining}}</md-table-cell>
      </md-table-row>

      <md-table-row>
        <md-table-cell class="text-left">% Stocks Remaining</md-table-cell>
        <md-table-cell>{{(portfolioSummary.percentStocksRemaining).toFixed(2)}}%</md-table-cell>
      </md-table-row>

      <md-table-row>
        <md-table-cell class="text-left">Total Current Teams Owned</md-table-cell>
        <md-table-cell>{{portfolioSummary.totalCurrentTeamsOwned}}</md-table-cell>
      </md-table-row>

      <md-table-row>
        <md-table-cell class="text-left">Total Current Teams Remaining</md-table-cell>
        <md-table-cell>{{portfolioSummary.totalCurrentTeamsRemaining}}</md-table-cell>
      </md-table-row>

      <md-table-row>
        <md-table-cell class="text-left">$ Won to Date</md-table-cell>
        <md-table-cell>{{portfolioSummary.moneyWonToDate | toCurrency}}</md-table-cell>
      </md-table-row>

      <md-table-row>
        <md-table-cell class="text-left">Won % Money Invested</md-table-cell>
        <md-table-cell>{{(portfolioSummary.percentMoneyWonInvested).toFixed(2)}}%</md-table-cell>
      </md-table-row>

      <md-table-row>
        <md-table-cell class="text-left">$ Remaining (At IPO Price)</md-table-cell>
        <md-table-cell>{{portfolioSummary.originalMoneyRemaining | toCurrency}}</md-table-cell>
      </md-table-row>

      <md-table-row>
        <md-table-cell class="text-left">Profit/Loss</md-table-cell>
        <md-table-cell>{{portfolioSummary.profitLoss | toCurrency}}</md-table-cell>
      </md-table-row>

      <md-table-row>
        <md-table-cell class="text-left">$ Remaining % Money Invested</md-table-cell>
        <md-table-cell>{{(portfolioSummary.percentMoneyRemaining).toFixed(2)}}%</md-table-cell>
      </md-table-row>
    </md-table>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';

export default {
  name: "PortfolioSummary",
  data() {
    return {
      isPageReady: false,
      entry: null,
      errorMessage: null,
      portfolioSummary: null
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
  methods: {
    async fetchPortfolioSummary() {
      try {
        const response = await apolloClient.query({
          fetchPolicy: 'no-cache',
          query: gql`
            query PortfolioSummaries($tournamentId: ID!, $entryId: ID) {
              portfolioSummaries(tournamentId: $tournamentId, entryId: $entryId) {
                ownerName,
                entryName,
                totalInitialInvestment,
                totalCashInvested,
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
          variables: {
            tournamentId: this.tournamentId,
            entryId: this.entryId
          }
        });

        const summaries = response.data.portfolioSummaries;
        this.portfolioSummary = summaries[0];
      } catch(err) {
        if(err.graphQLErrors && err.graphQLErrors.length > 0) {
          this.errorMessage = err.graphQLErrors[0].message;
        } else {
          this.errorMessage = "Server Error";
        }
        return err;
      }
    },
    async fetchEntry() {
      try {
        const response = await apolloClient.query({
          fetchPolicy: 'no-cache',
          query: gql`
            query Entry($id: ID!) {
              entry(id: $id) {
                id,
                tournamentId,
                name,
                ipoCashSpent,
                secondaryMarketCashSpent,
                secondaryMarketCashIncome
              }
            }
          `,
          variables: {
            id: this.entryId
          }
        });

        this.entry = response.data.entry;
      } catch(err) {
        if(err.graphQLErrors && err.graphQLErrors.length > 0) {
          this.errorMessage = err.graphQLErrors[0].message;
        } else {
          this.errorMessage = "Server Error";
        }
        return err;
      }
    },
  },
  async created() {
    await this.fetchEntry();
    await this.fetchPortfolioSummary();
    this.isPageReady = true;
  }
}
</script>

<style scoped>
</style>
