<template>
  <div v-if="isPageReady">
    <h2>Portfolio Detail</h2>
    <div v-if="successMessage" class="alert-success">
      {{successMessage}}
      <span @click="successMessage = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
    </div>
    <div class="md-layout">
      <div class="md-layout-item">
        <a v-if="isIpoOpen" class="link decorated-link add-to-stock-link" @click="goToStockOrder()">Add to Stock Order</a>
      </div>
      <div class="md-layout-item"></div>
      <div class="md-layout-item">
        <div v-if="isIpoOpen">
          <md-button v-if="tournamentTeamStocks.length > 0" class="md-raised md-primary" @click="showSellStocksFormModal = true">Reduce Stock Order</md-button>
          <md-button v-else disabled>Sell Stock(s)</md-button>
        </div>
      </div>
    </div>
    <md-table v-if="tournamentTeamStocks && tournamentTeamStocks.length" md-sort="teamName" md-sort-order="asc" v-model="tournamentTeamStocks">
      <md-table-row class="text-left" slot="md-table-row" slot-scope="{ item }">
        <md-table-cell md-label="Team" md-sort-by="teamName">{{ item.teamName }}</md-table-cell>
        <md-table-cell v-if="item.seed" md-label="Seed" md-sort-by="seed">{{ item.seed }}</md-table-cell>
        <md-table-cell v-if="item.region" md-label="Region" md-sort-by="region">{{ item.region }}</md-table-cell>
        <md-table-cell md-label="Shares Owned" md-sort-by="quantity">{{ item.quantity }}</md-table-cell>
        <md-table-cell md-label="IPO Cost/Share" md-sort-by="ipoPrice">{{ item.ipoPrice | toCurrency }}</md-table-cell>
        <md-table-cell md-label="Total Cost" md-sort-by="total">{{ (item.total)| toCurrency }}</md-table-cell>
      </md-table-row>
    </md-table>
    <div class="md-layout">
      <div class="md-layout-item"></div>
      <div class="md-layout-item"></div>
      <div class="md-layout-item total">
        Total: {{calculateTotal() | toCurrency}}
      </div>
    </div>

    <md-dialog v-if="showSellStocksFormModal" :md-active.sync="showSellStocksFormModal" :md-fullscreen="false">
      <md-dialog-title>Sell Stock</md-dialog-title>
      <md-dialog-content>
        <edit-stocks-form :form-type="'sell'" :success-cb="successCb" :entry-id="entryId"></edit-stocks-form>
      </md-dialog-content>
    </md-dialog>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';
import EditStocksForm from './EditStocksForm.vue';

export default {
  components: { EditStocksForm },
  name: "PortfolioDetail",
  data() {
    return {
      isPageReady: false,
      tournamentTeamStocks: [],
      showSellStocksFormModal: false,
      successMessage: null
    }
  },
  props: {
    entryId: {
      type: String
    },
    isIpoOpen: {
      type: Boolean
    }
  },
  watch: {
    async entryId(newVal, oldVal) {
      if(newVal && newVal !== oldVal) {
        await this.getStocks();
      }
    }
  },
  methods: {
    goToStockOrder() {
      this.$router.push({ 
        name: "Transactions",
        params: {
          entryId: this.entryId
        }
      });
    },
    calculateTotal() {
      return this.tournamentTeamStocks.reduce((result, teamStock) => {
        result += (teamStock.ipoPrice * teamStock.quantity);
        return result;
      }, 0)
    },
    async getStocks() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query StocksByEntryId($entryId: ID!) {
            stocksByEntryId(entryId: $entryId) {
              teamName,
              ipoPrice,
              quantity,
              seed,
              region
            }
          }
        `,
        variables: {
          entryId: this.entryId
        }
      });

      this.tournamentTeamStocks = response.data.stocksByEntryId.map((teamStock) => {
        const total = teamStock.ipoPrice * teamStock.quantity;
        return {
          ...teamStock,
          total
        }
      });
    },
    async successCb() {
      this.showSellStocksFormModal = false;
      await this.getStocks();
      this.successMessage = "Successfully sold stock!";
    }
  },
  async created() {
    await this.getStocks();
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
</style>