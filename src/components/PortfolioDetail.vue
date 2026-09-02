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
    <div class="table-wrapper" v-if="tournamentTeamStocks && tournamentTeamStocks.length">
      <table class="detail-table">
        <thead>
          <tr>
            <th class="col-team sortable" @click="sortBy('teamName')">Team <span class="sort-icon">{{ sortIcon('teamName') }}</span></th>
            <th v-if="hasSeed" class="sortable" @click="sortBy('seed')">Seed <span class="sort-icon">{{ sortIcon('seed') }}</span></th>
            <th v-if="hasRegion" class="sortable" @click="sortBy('region')">Region <span class="sort-icon">{{ sortIcon('region') }}</span></th>
            <th class="sortable" @click="sortBy('quantity')">Shares Owned <span class="sort-icon">{{ sortIcon('quantity') }}</span></th>
            <th class="sortable" @click="sortBy('costPerShare')">Cost/Share <span class="sort-icon">{{ sortIcon('costPerShare') }}</span></th>
            <th class="sortable" @click="sortBy('total')">Total Cost <span class="sort-icon">{{ sortIcon('total') }}</span></th>
            <th class="sortable" @click="sortBy('dividendPerShare')">Dividends/Share <span class="sort-icon">{{ sortIcon('dividendPerShare') }}</span></th>
            <th class="sortable" @click="sortBy('totalDividends')">Total Dividends <span class="sort-icon">{{ sortIcon('totalDividends') }}</span></th>
            <th class="sortable" @click="sortBy('profitLossPerShare')">Profit/Loss/Share <span class="sort-icon">{{ sortIcon('profitLossPerShare') }}</span></th>
            <th class="sortable" @click="sortBy('totalProfitLoss')">Total Profit/Loss <span class="sort-icon">{{ sortIcon('totalProfitLoss') }}</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in sortedStocks" :key="item.tournamentTeamId">
            <td class="col-team">{{ item.teamName }}</td>
            <td v-if="hasSeed">{{ item.seed }}</td>
            <td v-if="hasRegion">{{ item.region }}</td>
            <td>{{ item.quantity }}</td>
            <td>{{ item.costPerShare | toCurrency }}</td>
            <td>{{ item.total | toCurrency }}</td>
            <td>{{ item.dividendPerShare | toCurrency }}</td>
            <td>{{ item.totalDividends | toCurrency }}</td>
            <td>{{ item.profitLossPerShare | toCurrency }}</td>
            <td>{{ item.totalProfitLoss | toCurrency }}</td>
          </tr>
        </tbody>
      </table>
    </div>
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
      rawStocks: [],
      tournamentTeamStocks: [],
      showSellStocksFormModal: false,
      successMessage: null,
      sortField: 'teamName',
      sortOrder: 'asc'
    }
  },
  computed: {
    hasSeed() {
      return this.tournamentTeamStocks.some(s => s.seed);
    },
    hasRegion() {
      return this.tournamentTeamStocks.some(s => s.region);
    },
    sortedStocks() {
      return [...this.tournamentTeamStocks].sort((a, b) => {
        const aVal = a[this.sortField];
        const bVal = b[this.sortField];
        const dir = this.sortOrder === 'asc' ? 1 : -1;
        if (typeof aVal === 'string') {
          return dir * (aVal || '').localeCompare(bVal || '');
        }
        return dir * ((aVal || 0) - (bVal || 0));
      });
    }
  },
  props: {
    entryId: {
      type: String
    },
    isIpoOpen: {
      type: Boolean
    },
    tournamentTeamData: {
      type: Array,
      default: () => []
    }
  },
  watch: {
    async entryId(newVal, oldVal) {
      if(newVal && newVal !== oldVal) {
        await this.getStocks();
      }
    },
    tournamentTeamData() {
      this.enrichStocks();
    }
  },
  methods: {
    sortBy(field) {
      if (this.sortField === field) {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortOrder = 'asc';
      }
    },
    sortIcon(field) {
      if (this.sortField !== field) return '⇅';
      return this.sortOrder === 'asc' ? '▲' : '▼';
    },
    goToStockOrder() {
      this.$router.push({
        name: "Transactions",
        params: {
          entryId: this.entryId
        }
      });
    },
    truncateDecimals(number, digits) {
      const multiplier = Math.pow(10, digits);
      const adjustedNum = number * multiplier;
      const truncatedNum = Math[adjustedNum < 0 ? 'ceil' : 'floor'](adjustedNum);
      return truncatedNum / multiplier;
    },
    getDividendPerShare(tournamentTeamId) {
      const teamData = this.tournamentTeamData.find(t => t.id === tournamentTeamId);
      if (!teamData || !teamData.milestoneData || !teamData.numStocksInCirculation) {
        return 0;
      }
      const totalDividend = teamData.milestoneData.reduce((sum, milestone) => sum + (milestone.dividendPrice || 0), 0);
      return this.truncateDecimals(totalDividend / teamData.numStocksInCirculation, 2);
    },
    enrichStocks() {
      this.tournamentTeamStocks = this.rawStocks.map((teamStock) => {
        const total = teamStock.actualTotalCost != null ? teamStock.actualTotalCost : (teamStock.ipoPrice * teamStock.quantity);
        const costPerShare = teamStock.quantity > 0 ? total / teamStock.quantity : 0;
        const dividendPerShare = this.getDividendPerShare(teamStock.tournamentTeamId);
        const totalDividends = dividendPerShare * teamStock.quantity;
        const profitLossPerShare = dividendPerShare - costPerShare;
        const totalProfitLoss = totalDividends - total;

        return {
          ...teamStock,
          total,
          costPerShare,
          dividendPerShare,
          totalDividends,
          profitLossPerShare,
          totalProfitLoss
        }
      });
    },
    calculateTotal() {
      return this.tournamentTeamStocks.reduce((result, teamStock) => {
        result += teamStock.total;
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
              tournamentTeamId,
              ipoPrice,
              quantity,
              seed,
              region,
              actualTotalCost
            }
          }
        `,
        variables: {
          entryId: this.entryId
        }
      });

      this.rawStocks = response.data.stocksByEntryId;
      this.enrichStocks();
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

.table-wrapper {
  overflow: auto;
  max-height: calc(100vh - 320px);
  border: 1px solid rgba(0, 0, 0, .12);
}

.detail-table {
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  white-space: nowrap;
}

.detail-table th,
.detail-table td {
  padding: 8px 16px;
  text-align: left;
  border-bottom: 1px solid rgba(0, 0, 0, .12);
}

/* Sticky header */
.detail-table thead th {
  position: sticky;
  top: 0;
  background: #f5f5f5;
  z-index: 2;
  font-size: 12px;
  font-weight: 500;
}

.detail-table .sortable {
  cursor: pointer;
  user-select: none;
}

.detail-table .sortable:hover {
  background: #ebebeb;
}

.sort-icon {
  font-size: 10px;
  color: #888;
  margin-left: 4px;
}

/* Frozen col 1: Team */
.detail-table .col-team {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #fff;
  min-width: 160px;
  width: 160px;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  border-right: 2px solid #ddd;
}

.detail-table thead .col-team {
  z-index: 4;
  background: #f5f5f5;
}

/* Hover highlight */
.detail-table tbody tr:hover td {
  background: #f9f9f9;
}

.detail-table tbody tr:hover .col-team {
  background: #f0f0f0;
}

@media screen and (max-width: 600px) {
  .detail-table .col-team {
    position: static;
    border-right: none;
  }

  .detail-table thead .col-team {
    position: sticky;
    top: 0;
    z-index: 2;
  }
}
</style>