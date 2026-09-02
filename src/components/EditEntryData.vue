<template>
  <div v-if="isPageReady" class="content-container">
		<div class="back-btn-container text-left">
      <div class="btn-wrapper" @click="currentSelectedView = 'tournamentDetail'">
        <md-icon class="fa fa-angle-left link"></md-icon>
        <span class="link decorated-link">Back</span>
      </div>
    </div>

		<md-card>
      <div v-if="successMessage" class="alert-success">
        {{successMessage}}
        <span @click="successMessage = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
      </div>
      <md-card-header>
        <div class="md-title">{{selectedEntry.name}}</div>
      </md-card-header>

      <md-card-content>
        <div class="cash-spent-section">
          <div class="md-card text-left">
            <md-card-header>
              <div class="md-title">Cash Spent</div>
            </md-card-header>

            <md-card-content>
              <div>IPO Cash Spent: <input ref="ipoCashSpent" :value="ipoCashSpent" /></div>
              <div>Secondary Market Cash Spent: <input ref="secondaryMarketCashSpent" :value="secondaryMarketCashSpent" /></div>
              <div>Secondary Market Cash Income: <input ref="secondaryMarketCashIncome" :value="secondaryMarketCashIncome" /></div>
            </md-card-content>
						<md-button @click="saveCashInput()" class="md-primary">Save New Cash Values</md-button>
          </div>
        </div>
        <div class="stock-table">
          <md-table md-card v-model="stocks" class="text-left">
            <md-table-toolbar>
              <h3 class="md-title">Edit Stocks</h3>
            </md-table-toolbar>

            <md-table-row slot="md-table-row" slot-scope="{ item }">
              <md-table-cell md-label="Team Name" md-sort-by="name">{{ item.teamName }}</md-table-cell>
              <md-table-cell md-label="Quantity">{{ item.quantity }}</md-table-cell>
              <md-table-cell md-label="Delete Stocks">
                <span @click="showDeleteStockModal = true, selectedStockGroup = item"><md-icon class="fas fa-trash link"></md-icon></span>
              </md-table-cell>
							<md-table-cell md-label="Manual Stock Transactions">
                <span @click="showManualTradeModal = true, selectedStockGroup = item"><md-icon class="fas fa-exchange-alt link"></md-icon></span>
              </md-table-cell>
            </md-table-row>
          </md-table>
        </div>
        <div class="ipo-purchase-section">
          <div class="md-card">
            <md-card-header>
              <div class="md-title text-left">Purchase Stocks</div>
            </md-card-header>
            <ipo class="ipo-purchase-section" :tournament-id="tournamentId" :entry-id="selectedEntry.id" :ipo-budget="ipoBudget" :ipo-cash-spent.sync="selectedEntry.ipoCashSpent" :success-cb="ipoPurchaseCb"></ipo>
          </div>
        </div>
      </md-card-content>
    </md-card>

		<md-dialog v-if="showDeleteStockModal && selectedStockGroup" :md-active.sync="showDeleteStockModal" :md-fullscreen="false">
      <md-dialog-title>Delete Stocks for {{selectedStockGroup.teamName}}</md-dialog-title>
      <md-dialog-content>
				<div class="md-layout">
					<md-field>
						<label>Quantity to Delete</label>
						<md-input v-model="numStocksToDeleteOrTrade" type="number" min="1" :max="maxNumStocksToDelete"></md-input>
					</md-field>
          * Only stocks that aren't linked to cash trades can be safely deleted as of now. After stock deletion, the entry's IPO cash spent will automatically be updated to reflect the change
				</div>
      </md-dialog-content>
      <md-card-actions>
        <md-button :disabled="httpWait" @click="deleteStocks()" class="md-accent md-raised" :class="{ 'btn-disabled' : httpWait }">
          Delete
          <md-progress-spinner v-if="httpWait" class="btn-spin" :md-diameter="20" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner>
        </md-button>
      </md-card-actions>
    </md-dialog>

		<md-dialog v-if="showManualTradeModal && selectedStockGroup" :md-active.sync="showManualTradeModal" :md-fullscreen="false">
      <md-dialog-title>Manual Stock Transactions for {{selectedStockGroup.teamName}}</md-dialog-title>
      <md-dialog-content>
				<div class="md-layout">
					<md-field>
						<label>Quantity to Trade</label>
						<md-input v-model="numStocksToDeleteOrTrade" type="number" min="1" :max="maxNumStocksToDelete"></md-input>
					</md-field>
          <md-field>
            <label>Price per Stock</label>
            <currency-input :currency-to-format.sync="pricePerStock" :allows-negative="false"></currency-input>
          </md-field>
          <h3 class="label">Select Entry to Receive Stock</h3>
          <div class="custom-select-wrapper">
            <select class="custom-select" name="basic-dropdown" v-model="receivingEntryId">
              <option :value="null">Select Entry</option>
              <option v-for="entry in entries" :key="entry.id" :value="entry.id">{{entry.name}}</option>
            </select>
          </div>
				</div>
      </md-dialog-content>
      <md-card-actions>
        <md-button :disabled="httpWait" @click="executeTrade()" class="md-primary md-raised" :class="{ 'btn-disabled' : httpWait }">
          Execute Trade
          <md-progress-spinner v-if="httpWait" class="btn-spin" :md-diameter="20" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner>
        </md-button>
      </md-card-actions>
    </md-dialog>
  </div>
</template>

<script>
import Vue from 'vue';
import { apolloClient } from "../main";
import gql from 'graphql-tag';
import CurrencyInput from './CurrencyInput.vue';
import Ipo from './Ipo.vue';

export default {
  components: { CurrencyInput, Ipo },
  name: "EditEntryData",
  data() {
    return {
			attrs: {
        currentSelectedView: this.selectedView
      },
      isPageReady: false,
			successMessage: null,
      ipoCashSpent: null,
      secondaryMarketCashSpent: null,
      secondaryMarketCashIncome: null,
			stocks: [],
			showDeleteStockModal: false,
			showManualTradeModal: false,
			selectedStockGroup: null,
			numStocksToDeleteOrTrade: 1,
			transactions: [],
			maxNumStocksToDelete: 0,
      httpWait: false,
      stocksSafeForDeletion: [],
      pricePerStock: 0,
      receivingEntryId: null,
      entries: [],
      ipoBudget: null
    }
  },
  computed: {
    currentSelectedView: {
      get() {
        return this.attrs.currentSelectedView;
      },
      set(value) {
        this.attrs.currentSelectedView = value;
        this.$emit(`update:selected-view`, value);
      }
    }
  },
  props: {
		tournamentId: {
      type: String
    },
    leagueId: {
      type: String
    },
		selectedEntry: {
			type: Object
		},
		selectedView: {
			type: String
		}
  },
	watch: {
    selectedStockGroup(val) {
      if(val) {
				this.getMaxNumStocksToDelete();
      }
    },
    ipoCashSpent(val) {
      if(val && this.isPageReady) {
        Vue.nextTick(() => {
          this.$refs.ipoCashSpent.value = val;
        });
      }
    },
    secondaryMarketCashSpent(val) {
      if(val && this.isPageReady) {
        Vue.nextTick(() => {
          this.$refs.secondaryMarketCashSpent.value = val;
        });
      }
    },
    secondaryMarketCashIncome(val) {
      if(val && this.isPageReady) {
        Vue.nextTick(() => {
          this.$refs.secondaryMarketCashIncome.value = val;
        });
      }
    }
  },
  methods: {
    async fetchTournamentInfo() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query Tournament($id: ID!) {
            tournament(id: $id) {
              id
              name,
              isIpoOpen,
              status,
              masterSheetUpload,
              pricingSheetUpload,
              rulesSheetUpload,
              projectedPayoutSheetUpload,
              stockPayoutSheetUpload
              settings {
                ipoBudget,
                secondaryMarketBudget,
                milestones {
                  id,
                  name
                }
              }
            }
          }
        `,
        variables: {
          id: this.tournamentId
        }
      });

      const tournament = response.data.tournament;
      this.ipoBudget = tournament.settings.ipoBudget;
    },
		async fetchTransactions() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query GetTournamentTransactions($tournamentId: ID!) {
            getTournamentTransactions(tournamentId: $tournamentId) {
              id,
              entry { id, name },
              teamName,
              tournamentTeamId,
              quantity,
              cost,
							stockId,
              createdAt
            }
          }
        `,
        variables: {
          tournamentId: this.tournamentId
        }
      });

      this.transactions = response.data.getTournamentTransactions;
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
							teamId,
							tournamentTeamId,
							seed,
							region,
							stockIds
						}
					}
				`,
				variables: {
					entryId: this.selectedEntry.id
				}
			});

			this.stocks = response.data.stocksByEntryId;
    },
    async fetchTournamentEntries() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query EntriesByTournamentId($tournamentId: ID!) {
            entriesByTournamentId(tournamentId: $tournamentId) {
              id,
              name,
              tournamentId,
              ipoCashSpent,
              secondaryMarketCashSpent,
              secondaryMarketCashIncome
            }
          }
        `,
        variables: {
          tournamentId: this.tournamentId
        }
      });

      const entries = response.data.entriesByTournamentId;
      this.entries = entries.filter(entry => entry.id !== this.selectedEntry.id);

      const userEntry = entries.filter(entry => entry.id === this.selectedEntry.id)[0];
      this.ipoCashSpent = userEntry.ipoCashSpent;
      this.secondaryMarketCashSpent = userEntry.secondaryMarketCashSpent;
      this.secondaryMarketCashIncome = userEntry.secondaryMarketCashIncome;
    },
		async saveCashInput() {
      const ipoCashSpent = parseFloat(this.$refs.ipoCashSpent.value);
      const secondaryMarketCashSpent = parseFloat(this.$refs.secondaryMarketCashSpent.value);
      const secondaryMarketCashIncome = parseFloat(this.$refs.secondaryMarketCashIncome.value);
      if(!isNaN(ipoCashSpent) && !isNaN(secondaryMarketCashSpent) && !isNaN(secondaryMarketCashIncome)) {
        const response = await apolloClient.mutate({
          fetchPolicy: 'no-cache',
          mutation: gql`
            mutation updateEntryCash($entryId: ID!, $ipoCashSpent: Float!, $secondaryMarketCashSpent: Float!, $secondaryMarketCashIncome: Float!,) {
              updateEntryCash(entryId: $entryId, ipoCashSpent: $ipoCashSpent, secondaryMarketCashSpent: $secondaryMarketCashSpent, secondaryMarketCashIncome: $secondaryMarketCashIncome) {
                id,
                ipoCashSpent,
                secondaryMarketCashSpent,
                secondaryMarketCashIncome
              }
            }
          `,
          variables: {
            entryId: this.selectedEntry.id,
            ipoCashSpent,
            secondaryMarketCashSpent,
            secondaryMarketCashIncome
          }
        });

        const updatedEntry = response.data.updateEntryCash;

        await this.refreshData();
        this.ipoCashSpent = updatedEntry.ipoCashSpent;
        this.secondaryMarketCashSpent = updatedEntry.secondaryMarketCashSpent;
        this.secondaryMarketCashIncome = updatedEntry.secondaryMarketCashIncome;
        this.successMessage = `Successfully updated cash spent`;
      }
		},
		getMaxNumStocksToDelete() {
			// only stocks that dont belong to a cash transaction can be deleted
			if(!this.transactions || this.transactions.length === 0) {
				this.maxNumStocksToDelete = this.selectedStockGroup.quantity;
			}

      const stockIdsInCashTransactions = this.transactions.reduce((result, transaction) => {
        if(transaction.cost !== 0 && this.selectedStockGroup.stockIds.includes(transaction.stockId) && !result.includes(transaction.stockId)) {
          result.push(transaction.stockId);
        }

        return result;
      }, []);

      this.stocksSafeForDeletion = this.selectedStockGroup.stockIds.filter(stockId => !stockIdsInCashTransactions.includes(stockId));

			this.maxNumStocksToDelete = this.selectedStockGroup.quantity - stockIdsInCashTransactions.length;
		},
    async deleteStocks() {
      if(parseInt(this.numStocksToDeleteOrTrade) <= this.maxNumStocksToDelete) {
        const stockIds = this.stocksSafeForDeletion.slice(0, this.numStocksToDeleteOrTrade);

        const response = await apolloClient.mutate({
          fetchPolicy: 'no-cache',
          mutation: gql`
            mutation DeleteStocks($entryId: ID!, $stockIds: [ID!]!) {
              deleteStocks(entryId: $entryId, stockIds: $stockIds) {
                id,
                ipoCashSpent,
                secondaryMarketCashSpent,
                secondaryMarketCashIncome
              }
            }
          `,
          variables: {
            entryId: this.selectedEntry.id,
            stockIds
          }
        });

        const updatedEntry = response.data.deleteStocks;

        await this.refreshData();
        this.ipoCashSpent = updatedEntry.ipoCashSpent;
        this.secondaryMarketCashSpent = updatedEntry.secondaryMarketCashSpent;
        this.secondaryMarketCashIncome = updatedEntry.secondaryMarketCashIncome;
        this.successMessage = `Successfully deleted stocks`;
      }
		},
    async executeTrade() {
      if(this.receivingEntryId) {
        const stockIds = this.selectedStockGroup.stockIds.slice(0, this.numStocksToDeleteOrTrade);

        const response = await apolloClient.mutate({
          fetchPolicy: 'no-cache',
          mutation: gql`
            mutation ManualTrade($entryId: ID!, $stockIds: [ID!]!, $receivingEntryId: ID!, $pricePerStock: Float!) {
              manualTrade(entryId: $entryId, stockIds: $stockIds, receivingEntryId: $receivingEntryId, pricePerStock: $pricePerStock) {
                id,
                ipoCashSpent,
                secondaryMarketCashSpent,
                secondaryMarketCashIncome
              }
            }
          `,
          variables: {
            entryId: this.selectedEntry.id,
            stockIds,
            receivingEntryId: this.receivingEntryId,
            pricePerStock: this.pricePerStock
          }
        });

        const updatedEntry = response.data.manualTrade;

        await this.refreshData();
        this.ipoCashSpent = updatedEntry.ipoCashSpent;
        this.secondaryMarketCashSpent = updatedEntry.secondaryMarketCashSpent;
        this.successMessage = `Successfully traded stocks`;
      }
    },
    async ipoPurchaseCb() {
      await this.refreshData();
      await this.fetchTournamentEntries();
      this.successMessage = `Successfully purchased stocks`;
    },
    async refreshData() {
      await this.getStocks();
      await this.fetchTransactions();
      this.numStocksToDeleteOrTrade = 1;
      this.showDeleteStockModal = false;
      this.showManualTradeModal = false;
      this.showIpoPurchaseModal = false;
      this.receivingEntryId = null;
      this.pricePerStock = 0;
      this.isPageReady = true;
    }
  },
  async created() {
		await this.getStocks();
		await this.fetchTransactions();
    await this.fetchTournamentEntries();
    await this.fetchTournamentInfo();
		this.ipoCashSpent = this.selectedEntry.ipoCashSpent;
		this.secondaryMarketCashSpent = this.selectedEntry.secondaryMarketCashSpent;
    this.secondaryMarketCashIncome = this.selectedEntry.secondaryMarketCashIncome;
    this.isPageReady = true;
  }
}
</script>

<style scoped>
.ipo-purchase-section {
  padding-top: 20px;
}

.cash-spent-section {
  padding-bottom: 20px;
}
</style>
