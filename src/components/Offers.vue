<template>
  <div v-if="isPageReady">
    <h2>Offers</h2>
    *All times are shown in Eastern Time
    <div v-if="successMessage" class="alert-success">
      {{successMessage}}
      <span @click="successMessage = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
    </div>
    <div v-if="errorMessage" class="alert-error">
      {{errorMessage}}
      <span @click="errorMessage = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
    </div>
    <div class="offers-table">
      <md-table md-sort="teamName" md-sort-order="asc" md-card v-model="myOfferData" class="text-left">
        <md-table-toolbar>
          <h3 class="md-title">My Current Offers</h3>
          <md-button @click="initializeShowOfferForm('new')" class="md-primary">Create New Offer</md-button>
        </md-table-toolbar>

        <md-table-row slot="md-table-row" slot-scope="{ item }">
          <md-table-cell md-label="Team Name" md-sort-by="teamName">{{ item.teamName }}</md-table-cell>
          <md-table-cell md-label="Quantity" md-sort-by="numStocksForSale">{{ item.numStocksForSale }}</md-table-cell>
          <md-table-cell md-label="Current Ask Price">
            <span v-if="item.currentAskPrice">{{ item.currentAskPrice | toCurrency}}</span>
            <span v-else>{{getStockForStockOfferString(item)}}</span>
          </md-table-cell>
          <md-table-cell md-label="Expires At" md-sort-by="offerExpiresAt">{{ formatDate(parseInt(item.offerExpiresAt)) }}</md-table-cell>
          <!-- <md-table-cell md-label="Edit">
            <span @click="initializeShowOfferForm('edit', item)"><md-icon class="fas fa-edit link"></md-icon></span>
          </md-table-cell> -->
          <md-table-cell md-label="Delete">
            <span @click="showDeleteOfferModal = true, tournamentTeamIdToDelete=item.tournamentTeamId, selectedTeamNameToDelete = item.teamName"><md-icon class="fas fa-trash link"></md-icon></span>
          </md-table-cell>
        </md-table-row>
      </md-table>

      <md-table md-sort="teamName" md-sort-order="asc" md-card v-model="leagueOfferData" class="text-left">
        <md-table-toolbar>
          <h3 class="md-title">Current Open League Offers</h3>
        </md-table-toolbar>

        <md-table-row slot="md-table-row" slot-scope="{ item }">
          <md-table-cell md-label="Team Name" md-sort-by="teamName">{{ item.teamName }}</md-table-cell>
          <md-table-cell md-label="Quantity" md-sort-by="numStocksForSale">{{ item.numStocksForSale }}</md-table-cell>
          <md-table-cell md-label="Current Ask Price">
            <span v-if="item.currentAskPrice">{{ item.currentAskPrice | toCurrency}}</span>
            <span v-else>{{getStockForStockOfferString(item)}}</span>
          </md-table-cell>
          <md-table-cell md-label="Expires At" md-sort-by="offerExpiresAt">{{ formatDate(parseInt(item.offerExpiresAt)) }}</md-table-cell>
          <md-table-cell md-label="Buy/Trade">
            <span v-if="item.currentAskPrice" @click="initializeBuyForm(item)"><md-icon class="fas fa-shopping-cart link"></md-icon></span>
            <span v-if="!item.currentAskPrice && item.tradableTeams && hasStocksForTrade(item.tradableTeams)" @click="initializeTradeForm(item)"><md-icon class="fas fa-exchange-alt link"></md-icon></span>
          </md-table-cell>
        </md-table-row>
      </md-table>
    </div>

    <div class="offers-table">
      <md-table md-sort="teamName" md-sort-order="asc" md-card v-model="myBidData" class="text-left">
        <md-table-toolbar>
          <h3 class="md-title">My Current Bids</h3>
          <md-button @click="initializeShowBidForm('new')" class="md-primary">Create New Bid</md-button>
        </md-table-toolbar>

        <md-table-row slot="md-table-row" slot-scope="{ item }">
          <md-table-cell md-label="Team" md-sort-by="teamName">{{ item.teamName }}</md-table-cell>
          <md-table-cell md-label="Quantity" md-sort-by="quantity">{{ item.quantity }}</md-table-cell>
          <md-table-cell md-label="Max Bid Price">
            <span v-if="item.price">{{ item.price | toCurrency }}</span>
            <span v-else>{{getStockForStockOfferString(item)}}</span>
          </md-table-cell>
          <md-table-cell md-label="Expires At" md-sort-by="expiresAt">{{ formatDate(parseInt(item.expiresAt)) }}</md-table-cell>
          <!-- <md-table-cell md-label="Edit">
            <span @click="initializeShowBidForm('edit', item)"><md-icon class="fas fa-edit link"></md-icon></span>
          </md-table-cell> -->
          <md-table-cell md-label="Delete">
            <span @click="showDeleteBidModal = true, bidTeamIdToDelete=item.id, selectedTeamNameToDelete = item.teamName"><md-icon class="fas fa-trash link"></md-icon></span>
          </md-table-cell>
        </md-table-row>
      </md-table>

      <md-table md-sort="teamName" md-sort-order="asc" md-card v-model="leagueBidData" class="text-left">
        <md-table-toolbar>
          <h3 class="md-title">Current Open League Bids</h3>
        </md-table-toolbar>

        <md-table-row slot="md-table-row" slot-scope="{ item }">
          <md-table-cell md-label="Team" md-sort-by="teamName">{{ item.teamName }}</md-table-cell>
          <md-table-cell md-label="Quantity" md-sort-by="quantity">{{ item.quantity }}</md-table-cell>
          <md-table-cell md-label="Max Bid Price">
            <span v-if="item.price">{{ item.price | toCurrency }}</span>
            <span v-else>{{getStockForStockOfferString(item)}}</span>
          </md-table-cell>
          <md-table-cell md-label="Expires At" md-sort-by="expiresAt">{{ formatDate(parseInt(item.expiresAt)) }}</md-table-cell>
          <md-table-cell md-label="Sell">
            <span v-if="item.price && hasStockToSell(item)" @click="initializeSellForm(item)"><md-icon class="fas fa-dollar-sign link"></md-icon></span>
            <span v-if="!item.price && hasStockToSell(item)" @click="initializeAcceptStockBidForm(item)"><md-icon class="fas fa-exchange-alt link"></md-icon></span>
          </md-table-cell>
        </md-table-row>
      </md-table>
    </div>

    <div class="offers-table">
      <md-table md-sort="createdAt" md-sort-order="asc" md-card v-model="transactionData" class="text-left">
        <md-table-toolbar>
          <h3 class="md-title">Recent Transactions</h3>
          <md-button @click="showMoreTransactionsModal = true" class="md-primary">See More</md-button>
        </md-table-toolbar>

        <md-table-row slot="md-table-row" slot-scope="{ item }">
          <md-table-cell md-label="Transaction Detail" md-sort-by="text">{{ item.text }}</md-table-cell>
          <md-table-cell md-label="Date" md-sort-by="createdAt">{{ item.createdAt }}</md-table-cell>
        </md-table-row>
      </md-table>
    </div>

    <md-dialog v-if="showOfferForm" :md-active.sync="showOfferForm" :md-fullscreen="false">
      <md-dialog-title>Create Offer</md-dialog-title>
      <md-dialog-content>
        <offer-form :form-type="offerFormOptions.type" :selected-offer="offerFormOptions.selectedOffer" :create-offer-success-cb="createOfferSuccessCb" :trade-accepted-cb="tradeAcceptedCb" :entry-id="entryId" :tournament-id="tournamentId" :close-cb="closeCb"></offer-form>
      </md-dialog-content>
    </md-dialog>

    <md-dialog v-if="showBidForm" :md-active.sync="showBidForm" :md-fullscreen="false">
      <md-dialog-title>Create New Bid</md-dialog-title>
      <md-dialog-content>
        <bid-form :form-type="bidFormOptions.type" :selected-bid="bidFormOptions.selectedBid" :create-new-bid-success-cb="createNewBidSuccessCb" :trade-accepted-cb="tradeAcceptedCb" :entry-id="entryId" :tournament-id="tournamentId" :close-cb="closeCb"></bid-form>
      </md-dialog-content>
    </md-dialog>

    <md-dialog v-if="showDeleteOfferModal && tournamentTeamIdToDelete !== null && selectedTeamNameToDelete !== null" :md-active.sync="showDeleteOfferModal" :md-fullscreen="false">
      <md-dialog-title>Delete Offer</md-dialog-title>
      <md-dialog-content>
        <div class="text-center">
          Are you sure you want to delete your offer for {{selectedTeamNameToDelete}}?
        </div>
      </md-dialog-content>

      <md-card-actions>
        <md-button @click="deleteOffer(tournamentTeamIdToDelete)" class="md-accent md-raised">
          Confirm Delete
        </md-button>
        <md-button @click="showDeleteOfferModal = false, tournamentTeamIdToDelete = null, selectedTeamNameToDelete = null" class="md-primary md-raised">
          Cancel
        </md-button>
      </md-card-actions>
    </md-dialog>

    <md-dialog v-if="showDeleteBidModal && bidTeamIdToDelete !== null && selectedTeamNameToDelete !== null" :md-active.sync="showDeleteBidModal" :md-fullscreen="false">
      <md-dialog-title>Delete Offer</md-dialog-title>
      <md-dialog-content>
        <div class="text-center">
          Are you sure you want to delete your bid for {{selectedTeamNameToDelete}}?
        </div>
      </md-dialog-content>

      <md-card-actions>
        <md-button @click="deleteBid(bidTeamIdToDelete)" class="md-accent md-raised">
          Confirm Delete
        </md-button>
        <md-button @click="showDeleteBidModal = false, bidTeamIdToDelete = null, selectedTeamNameToDelete = null" class="md-primary md-raised">
          Cancel
        </md-button>
      </md-card-actions>
    </md-dialog>

    <md-dialog v-if="showBuyForm" :md-active.sync="showBuyForm" :md-fullscreen="false">
      <md-dialog-title>Buy Stock</md-dialog-title>
      <md-dialog-content>
        <buy-form :buy-stock-data="buyStockData" :buy-stock-success-cb="buyStockSuccessCb" :entry-id="entryId"></buy-form>
      </md-dialog-content>
    </md-dialog>

    <md-dialog v-if="showTradeForm" :md-active.sync="showTradeForm" :md-fullscreen="false">
      <md-dialog-title>Trade Stock</md-dialog-title>
      <md-dialog-content>
        <trade-form :trade-stock-data="tradeStockData" :trade-stock-success-cb="tradeStockSuccessCb" :entry-id="entryId"></trade-form>
      </md-dialog-content>
    </md-dialog>

    <md-dialog v-if="showSellForm" :md-active.sync="showSellForm" :md-fullscreen="false">
      <md-dialog-title>Sell Stock</md-dialog-title>
      <md-dialog-content>
        <sell-form :sell-stock-data="sellStockData" :sell-stock-success-cb="sellStockSuccessCb" :entry-id="entryId"></sell-form>
      </md-dialog-content>
    </md-dialog>

    <md-dialog v-if="showAcceptStockBidForm" :md-active.sync="showAcceptStockBidForm" :md-fullscreen="false">
      <md-dialog-title>Accept Bid</md-dialog-title>
      <md-dialog-content>
        <accept-stock-bid-form :accept-stock-bid-data="acceptStockBidData" :accept-stock-bid-success-cb="acceptStockBidSuccessCb" :entry-id="entryId"></accept-stock-bid-form>
      </md-dialog-content>
    </md-dialog>

    <md-dialog v-if="showMoreTransactionsModal" :md-active.sync="showMoreTransactionsModal" :md-fullscreen="false">
      <md-dialog-title>All Transactions</md-dialog-title>
      <md-dialog-content>
        <md-table md-sort="createAt" md-sort-order="asc" md-card v-model="rawTransactionData" class="text-left">
          <md-table-row slot="md-table-row" slot-scope="{ item }">
            <md-table-cell md-label="Transaction Detail" md-sort-by="text">{{ item.text }}</md-table-cell>
            <md-table-cell md-label="Date" md-sort-by="createdAt">{{ item.createdAt }}</md-table-cell>
          </md-table-row>
        </md-table>
      </md-dialog-content>
    </md-dialog>
  </div>
</template>

<script>
/* eslint-disable */
import { apolloClient } from "../main";
import gql from 'graphql-tag';
import OfferForm from './OfferForm.vue';
import BidForm from './BidForm.vue';
import BuyForm from './BuyForm.vue';
import SellForm from './SellForm.vue';
import TradeForm from './TradeForm.vue';
import AcceptStockBidForm from './AcceptStockBidForm.vue';
import { DateTime } from "luxon";

export default {
  components: { OfferForm, BidForm, BuyForm, SellForm, TradeForm, AcceptStockBidForm },
  name: "Offers",
  data() {
    return {
      isPageReady: false,
      successMessage: null,
      showOfferForm: false,
      offerFormOptions: {},
      bidFormOptions: {},
      showBidForm: false,
      myOfferData: [],
      leagueOfferData: [],
      myBidData: [],
      leagueBidData: [],
      transactionData: [],
      buyStockData: null,
      showBuyForm: false,
      showSellForm: false,
      availableStocks: null,
      showMoreTransactionsModal: false,
      rawTransactionData: [],
      errorMessage: null,
      maxMilestoneData: [],
      showDeleteOfferModal: false,
      tournamentTeamIdToDelete: null,
      selectedTeamNameToDelete: null,
      showDeleteBidModal: false,
      bidTeamIdToDelete: null,
      showTradeForm: false,
      tradeStockData: null,
      showAcceptStockBidForm: false,
      acceptStockBidData: null
    }
  },
  props: {
    tournamentId: {
      type: String
    },
    entryId: {
      type: String
    }
  },
  methods: {
    hasStocksForTrade(tradableTeams) {
      let result = false;
      for(const tradableTeam of tradableTeams) {
        const availableStock = this.availableStocks.find(stock => stock.tournamentTeamId === tradableTeam.tournamentTeamId);
        if(availableStock) {
          result = availableStock.quantity >= tradableTeam.quantity;
        }
        if(result === false) {
          break;
        }
      }

      return result;
    },
    async createNewBidSuccessCb() {
      this.showBidForm = false;
      await this.initBidsAndAsks();
      this.successMessage = "Successfully created new bid!";
    },
    async createOfferSuccessCb() {
      this.showOfferForm = false;
      await this.initBidsAndAsks();
      this.successMessage = "Successfully set new stock offer!";
    },
    async buyStockSuccessCb() {
      this.showBuyForm = false;
      await this.initBidsAndAsks();
      this.successMessage = "Successfully bought stock!";
    },
    async tradeStockSuccessCb() {
      this.showTradeForm = false;
      await this.initBidsAndAsks();
      this.successMessage = "Successfully traded stock!";
    },
    async sellStockSuccessCb() {
      this.showSellForm = false;
      await this.initBidsAndAsks();
      this.successMessage = "Successfully sold stock!";
    },
    async acceptStockBidSuccessCb() {
      this.showAcceptStockBidForm = false;
      await this.initBidsAndAsks();
      this.successMessage = "Successfully accepted bid!";
    },
    async closeCb() {
      this.showBidForm = false;
      this.showOfferForm = false;
      this.showBuyForm = false;
      this.showTradeForm = false;
      this.showSellForm = false;
      this.showAcceptStockBidForm = false;
      await this.initBidsAndAsks();
    },
    async deleteOffer(tournamentTeamId) {
      await apolloClient.mutate({
        fetchPolicy: 'no-cache',
        mutation: gql`
          mutation SetTournamentTeamStockPriceToNull($tournamentTeamId: ID!, $entryId: ID!) {
            setTournamentTeamStockPriceToNull(tournamentTeamId: $tournamentTeamId, entryId: $entryId) {
              id
            }
          }
        `,
        variables: {
          tournamentTeamId,
          entryId: this.entryId
        }
      });

      await this.initBidsAndAsks();
      this.showDeleteOfferModal = false;
      this.tournamentTeamIdToDelete = null;
      this.selectedTeamNameToDelete = null;
      this.successMessage = "Successfully deleted offer!";
    },
    async deleteBid(entryBidId) {
      await apolloClient.mutate({
        fetchPolicy: 'no-cache',
        mutation: gql`
          mutation DeleteEntryBid($id: ID!) {
            deleteEntryBid(id: $id) {
              id
            }
          }
        `,
        variables: {
          id: entryBidId
        }
      });

      await this.initBidsAndAsks();
      this.showDeleteBidModal = false;
      this.bidTeamIdToDelete = null;
      this.selectedTeamNameToDelete = null;
      this.successMessage = "Successfully deleted bid!";
    },
    hasStockToSell(stockData) {
      return this.availableStocks.find(stock => stock.tournamentTeamId === stockData.tournamentTeamId);
    },
    async tradeAcceptedCb(initializedFrom, numAccepted, numOffered) {
      await this.initBidsAndAsks();
      if(initializedFrom === "BID") {
        this.showBidForm = false;
        this.successMessage = `${numAccepted} of ${numOffered} bid(s) been accepted! These trades have processed`;
      }
      if(initializedFrom === "OFFER") {
        this.showOfferForm = false;
        this.successMessage = `${numAccepted} of ${numOffered} offer(s) has been accepted! These trades have processed`;
      }
    },
    formatDate(timestamp) {
      const date = new Date(timestamp).toLocaleString('en-US', {
        timeZone: 'America/New_York',
        weekday: 'short', // long, short, narrow
        day: 'numeric', // numeric, 2-digit
        year: 'numeric', // numeric, 2-digit
        month: 'long', // numeric, 2-digit, long, short, narrow
        hour: 'numeric', // numeric, 2-digit
        minute: 'numeric' // numeric, 2-digit
      })
      return date;
    },
    async fetchEntryBids() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query GetBidsForEntry($entryId: ID!) {
            getBidsForEntry(entryId: $entryId) {
              myBids {
                id,
                tournamentTeamId,
                teamName,
                price,
                quantity,
                expiresAt,
                tradableTeams {
                  tournamentTeamId,
                  teamName,
                  quantity,
                  price
                }
              },
              leagueBids {
                id,
                tournamentTeamId,
                teamName,
                price,
                quantity,
                expiresAt,
                tradableTeams {
                  tournamentTeamId,
                  teamName,
                  quantity,
                  price
                }
              }
            }
          }
        `,
        variables: {
          entryId: this.entryId
        }
      });

      this.myBidData = response.data.getBidsForEntry.myBids;
      this.leagueBidData = response.data.getBidsForEntry.leagueBids;
    },
    async fetchOffers() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query GetOfferedStocksForTournament($tournamentId: ID!, $entryId: ID!) {
            getOfferedStocksForTournament(tournamentId: $tournamentId, entryId: $entryId) {
              myStockOffers {
                stockId,
                teamName,
                numStocksForSale,
                currentAskPrice,
                tournamentTeamId,
                offerExpiresAt,
                tradableTeams {
                  tournamentTeamId,
                  teamName,
                  quantity,
                  price
                }
              },
              leagueStockOffers {
                stockId,
                teamName,
                numStocksForSale,
                currentAskPrice,
                tournamentTeamId,
                offerExpiresAt,
                tradableTeams {
                  tournamentTeamId,
                  teamName,
                  quantity,
                  price
                }
              }
            }
          }
        `,
        variables: {
          tournamentId: this.tournamentId,
          entryId: this.entryId
        }
      });

      this.myOfferData = response.data.getOfferedStocksForTournament.myStockOffers;
      this.leagueOfferData = response.data.getOfferedStocksForTournament.leagueStockOffers;
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
              createdAt
            }
          }
        `,
        variables: {
          tournamentId: this.tournamentId
        }
      });

      this.rawTransactionData = response.data.getTournamentTransactions;
      if(this.rawTransactionData.length > 10) {
        this.transactionData = this.rawTransactionData.slice(0, 10);
      } else {
        this.transactionData = this.rawTransactionData;
      }

      this.transactionData = this.transactionData.map((data) => {
        const plural = data.quantity > 1 ? 's' : '';
        let verb = data.cost > 0 ? 'bought' : 'sold';
        let text = `${data.entry.name} ${verb} ${data.quantity} share${plural} of ${data.teamName} for ${this.$options.filters.toCurrency(Math.abs(data.cost))}`;
        if(data.cost === 0) {
          verb = 'traded';
          text = `${data.entry.name} ${verb} for ${data.quantity} share${plural} of ${data.teamName}`;
        }

        return {
          text,
          createdAt: this.formatDate(parseInt(data.createdAt))
        }
      });

      this.rawTransactionData = this.rawTransactionData.map((data) => {
        const plural = data.quantity > 1 ? 's' : '';
        let verb = data.cost > 0 ? 'bought' : 'sold';
        let text = `${data.entry.name} ${verb} ${data.quantity} share${plural} of ${data.teamName} for ${this.$options.filters.toCurrency(Math.abs(data.cost))}`;
        if(data.cost === 0) {
          verb = 'traded';
          text = `${data.entry.name} ${verb} for ${data.quantity} share${plural} of ${data.teamName}`;
        }

        return {
          text,
          createdAt: this.formatDate(parseInt(data.createdAt))
        }
      });
    },
    async getStocksForEntry() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query StocksByEntryId($entryId: ID!) {
            stocksByEntryId(entryId: $entryId) {
              teamName,
              teamId,
              tournamentTeamId,
              ipoPrice,
              quantity
            }
          }
        `,
        variables: {
          entryId: this.entryId
        }
      });

      this.availableStocks = response.data.stocksByEntryId;
    },
    async refreshExpiredBidsAndAsks() {
      await apolloClient.mutate({
        fetchPolicy: 'no-cache',
        mutation: gql`
          mutation RemoveExpiredBidsAndAsks($tournamentId: ID!) {
            removeExpiredBidsAndAsks(tournamentId: $tournamentId) {
              response
            }
          }
        `,
        variables: {
          tournamentId: this.tournamentId
        }
      });
    },
    getStockForStockOfferString(offer) {
      const offerString = offer.tradableTeams.reduce((result, team, index) => {
        result += `${team.quantity} ${team.teamName}`;
        if(offer.tradableTeams.length > 1 && index !== offer.tradableTeams.length -1) {
          result += ", ";
        }
        return result;
      }, "")

      return offerString;
    },
    initializeShowOfferForm(type, selectedOffer) {
      this.showOfferForm = true;
      this.offerFormOptions.type = type;
      if(selectedOffer) {
        this.offerFormOptions.selectedOffer = selectedOffer;
      } else {
        this.offerFormOptions.selectedOffer = null;
      }
    },
    initializeShowBidForm(type, selectedBid) {
      this.showBidForm = true;
      this.bidFormOptions.type = type;
      if(selectedBid) {
        this.bidFormOptions.selectedBid = selectedBid;
      } else {
        this.bidFormOptions.selectedBid = null;
      }
    },
    async initializeBuyForm(buyStockData) {
      const now = DateTime.local({ zone: "America/New_York" });
      if(now > buyStockData.offerExpiresAt) {
        this.errorMessage = "Offer has expired";
        await this.initBidsAndAsks();
        return;
      }
      this.showBuyForm = true;
      this.buyStockData = buyStockData;
    },
    async initializeTradeForm(stockData) {
      const now = DateTime.local({ zone: "America/New_York" });
      if(now > stockData.offerExpiresAt) {
        this.errorMessage = "Offer has expired";
        await this.initBidsAndAsks();
        return;
      }
      this.showTradeForm = true;
      this.tradeStockData = stockData;
    },
    async initializeSellForm(sellStockData) {
      const now = DateTime.local({ zone: "America/New_York" });
      if(now > sellStockData.expiresAt) {
        this.errorMessage = "Offer has expired";
        await this.initBidsAndAsks();
        return;
      }
      this.showSellForm = true;
      this.sellStockData = sellStockData;
    },
    async initializeAcceptStockBidForm(acceptStockBidData) {
      const now = DateTime.local({ zone: "America/New_York" });
      if(now > acceptStockBidData.expiresAt) {
        this.errorMessage = "Offer has expired";
        await this.initBidsAndAsks();
        return;
      }
      this.showAcceptStockBidForm = true;
      this.acceptStockBidData = acceptStockBidData;
    },
    async initBidsAndAsks() {
      await this.refreshExpiredBidsAndAsks();
      await this.fetchOffers();
      await this.fetchEntryBids();
      await this.fetchTransactions();
      await this.getStocksForEntry();
    }
  },
  async created() {
    await this.initBidsAndAsks();
    this.isPageReady = true;
  }
}
</script>

<style scoped>
.offers-table {
  padding-bottom: 20px;
}
</style>