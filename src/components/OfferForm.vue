<template>
  <div>
    <div>
      <h3 class="label"><span v-if="formType === 'new'">Select a </span>Stock for Offer</h3>
      <div v-if="formType === 'new'" class="custom-select-wrapper">
        <select class="custom-select" name="basic-dropdown" v-model="selectedOfferFormInput">
          <option :value="null">Select Stock</option>
          <option v-for="stock in offerFormInput" :key="stock.id" :value="stock">{{stock.teamName}}</option>
        </select>
      </div>
      <div v-else>
        {{selectedOffer.teamName}}
      </div>
    </div>
    <div v-if="selectedOfferFormInput">
      <div class="md-layout">
        <md-field>
          <label>Quantity</label>
          <md-input v-model="selectedOfferFormInput.quantity" type="number" min="1" :max="selectedOfferFormInput.quantityOwned"></md-input>
        </md-field>
      </div>
      <h3 class="label">Select Offer Type</h3>
      <select class="custom-select" name="basic-dropdown" v-model="offerType">
        <option value="CASH">Cash</option>
        <option value="STOCK">Stock</option>
      </select>
      <div class="md-layout" v-if="offerType === 'CASH'">
        <md-field>
          <label>Sell Price</label>
          <currency-input :currency-to-format.sync="selectedOfferFormInput.sellPrice" :allows-negative="false"></currency-input>
        </md-field>
      </div>
      <div class="md-layout" v-if="offerType === 'STOCK'">
        <md-table v-model="filteredTradableTeamInput" md-sort="teamName" class="text-left" md-sort-order="asc">
          <md-table-row slot="md-table-row" slot-scope="{ item }">
            <md-table-cell md-label="Team" md-sort-by="teamName">{{ item.teamName }}</md-table-cell>
            <!-- Line Below Comment out for NFL -->
            <!-- <md-table-cell v-if="item.seed" md-label="Seed" md-sort-by="seed">{{ item.seed }}</md-table-cell> -->
            <md-table-cell v-if="item.region" md-label="Region" md-sort-by="region">{{ item.region }}</md-table-cell>
            <md-table-cell md-label="Quantity">
              <input :ref="'quantityInput-' + item.id" @change="setTradableTeamQuantity(item.id)" @keyup="setTradableTeamQuantity(item.id)" :value="item.quantity" class="quantity-input" type="number" step="1" min="0" max="">
            </md-table-cell>
          </md-table-row>
        </md-table>
      </div>
      <div class="md-layout">
        <div>
          <h3 class="label">Expires Date</h3>
        </div>
        <md-datepicker v-model="datePickerInput" :md-disabled-dates="disabledDates" md-immediately/>
        <time-picker class="timepicker-container" :selected-hour.sync="expiresHoursMinutes.hour" :selected-minute.sync="expiresHoursMinutes.minute"></time-picker>
      </div>
    </div>
    <div v-if="errorMessage" class="error text-center">
      {{errorMessage}}
    </div>
    <md-card-actions>
      <span class="submit-confirmation" v-if="selectedOfferFormInput && selectedOfferFormInput.quantity && selectedOfferFormInput.quantity > 0 && ((offerType === 'CASH' && selectedOfferFormInput.sellPrice) || offerType === 'STOCK')">
        Are you sure you want to submit this offer?
      </span>
      <md-button :disabled="httpWait" v-if="selectedOfferFormInput && selectedOfferFormInput.quantity && selectedOfferFormInput.quantity > 0 && ((offerType === 'CASH' && selectedOfferFormInput.sellPrice) || offerType === 'STOCK')" class="md-primary" :class="{ 'btn-disabled' : httpWait }" @click="submit">
        Submit
        <md-progress-spinner v-if="httpWait" class="btn-spin" :md-diameter="20" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner>
      </md-button>
      <md-button v-else disabled>Submit</md-button>
      <md-button class="md-accent" @click="closeCb">Cancel</md-button>
    </md-card-actions>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';
import CurrencyInput from './CurrencyInput.vue';
import { DateTime } from "luxon";
import TimePicker from './TimePicker.vue';

export default {
  components: { CurrencyInput, TimePicker },
  name: "OfferForm",
  data() {
    let expiresDate = DateTime.fromObject({ zone: "America/New_York" }).endOf('day');
    const now = DateTime.fromObject({ zone: "America/New_York" });
    return {
      disabledDates: date => {
        const beginningOfDay = now.startOf('day');
        const dateTime = date.getTime();
        return dateTime < beginningOfDay;
      },
      availableStocks: null,
      offerFormInput: [],
      errorMessage: null,
      selectedOfferFormInput: null,
      datePickerInput: expiresDate.toJSDate(),
      httpWait: false,
      offerType: "CASH",
      tradableTeamInput: [],
      filteredTradableTeamInput: [],
      expiresHoursMinutes: {},
      startOfDayMillis: null,
      expiresDateInput: null
    }
  },
  props: {
    formType: {
      type: String
    },
    createOfferSuccessCb: {
      type: Function
    },
    tradeAccpetedCb: {
      type: Function
    },
    entryId: {
      type: String
    },
    selectedOffer: {
      type: Object
    },
    tournamentId: {
      type: String
    },
    closeCb: {
      type: Function
    }
  },
  watch: {
    async selectedOfferFormInput(val) {
      if(val) {
				this.filteredTradableTeamInput = this.tradableTeamInput.filter(team => team.teamId !== val.teamId);
      }
    },
    expiresHoursMinutes: {
      handler(val) {
        if(val) {
          this.checkIfValueChanged();
        }
      },
      deep: true
    },
    datePickerInput(val) {
      if(val) {
        this.checkIfValueChanged();
      }
    }
  },
  methods: {
    checkIfValueChanged() {
      this.startOfDayMillis = DateTime.fromJSDate(this.datePickerInput, { zone: "America/New_York" }).startOf('day').toMillis();
      this.expiresDateInput = DateTime.fromMillis(this.startOfDayMillis).plus({ hours: this.expiresHoursMinutes.hour, minutes: this.expiresHoursMinutes.minute }).toMillis();
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
    async submit() {
      const nowMilliseconds = DateTime.fromObject({ zone: "America/New_York" }).toMillis();
      if(this.expiresDateInput < nowMilliseconds) {
        this.errorMessage = "Expires date must be in the future";
        return;
      }

      const email = sessionStorage.getItem('sports-exchange.email');
      const offerExpiresAt = DateTime.fromMillis(this.expiresDateInput).toJSDate().getTime();
      let input = {
        email,
        entryId: this.entryId,
        tournamentTeamId: this.selectedOfferFormInput.tournamentTeamId,
        quantity: parseInt(this.selectedOfferFormInput.quantity),
        newPrice: null,
        tradableTeams: null,
        offerExpiresAt
      };

      if(this.offerType === 'CASH') {
        input.newPrice = parseFloat(this.selectedOfferFormInput.sellPrice);
      }
      if(this.offerType === 'STOCK') {
        let totalTradableTeamStocksOffered = 0;
        const tradableTeamsInput = JSON.parse(JSON.stringify(this.filteredTradableTeamInput)).reduce((result, tradableTeamInput) => {
          if(tradableTeamInput.quantity > 0) {
            result.push({
              tournamentTeamId: tradableTeamInput.id,
              teamName: tradableTeamInput.teamName,
              quantity: parseInt(tradableTeamInput.quantity),
              price: 0
            });
            totalTradableTeamStocksOffered += parseInt(tradableTeamInput.quantity);
          }
          return result;
        }, []).map((tradableTeamInput) => {
          const calculatedPricePerTeam = (this.selectedOfferFormInput.ipoPrice * input.quantity) / totalTradableTeamStocksOffered;

          return {
            ...tradableTeamInput,
            price: parseFloat(calculatedPricePerTeam.toFixed(2))
          }
        });

        input.tradableTeams = tradableTeamsInput;

        if(totalTradableTeamStocksOffered < 1) {
          this.errorMessage = "At least one stock must be set if offer type is stock";
          return;
        }
      }

      if(this.validateStockInput()) {
        this.httpWait = true;

        try {
          const response = await apolloClient.mutate({
            mutation: gql`
              mutation SetStockAskPrice($input: StockPriceInput!) {
                setStockAskPrice(input: $input) {
                  teamName,
                  teamId,
                  ipoPrice,
                  quantity,
                  trades {
                    id,
                    entry { id, name },
                    teamName,
                    tournamentTeamId,
                    quantity,
                    cost,
                    createdAt
                  }
                }
              }
            `,
            variables: {
              input
            }
          });

          const offerData = response.data.setStockAskPrice;
          this.httpWait = false;
          if(offerData.trades && offerData.trades.length > 0) {
            const numAccepted = offerData.trades.length/2;
            this.tradeAcceptedCb("OFFER", numAccepted, this.selectedOfferFormInput.quantity);
          } else {
            this.createOfferSuccessCb();
          }
        } catch(err) {
          if(err.graphQLErrors && err.graphQLErrors.length > 0) {
            this.errorMessage = err.graphQLErrors[0].message;
          } else {
            this.errorMessage = "Server Error";
          }
          this.httpWait = false;
          return err;
        }
        this.httpWait = false;
      }
    },
    validateStockInput() {
      if(this.selectedOfferFormInput.quantity > this.selectedOfferFormInput.quantityOwned) {
        this.errorMessage = "Desired stock amount exceeds current amount on hand";
        return false;
      } else if(!this.expiresDateInput) {
        this.errorMessage = "Must select an expires date";
        return false;
      }
      return true;
    },
    async setTradableTeamInput() {
      const response = await apolloClient.query({
      fetchPolicy: 'no-cache',
        query: gql`
          query TournamentTeams($tournamentId: ID!) {
            tournamentTeams(tournamentId: $tournamentId) {
              id,
              teamId,
              teamName,
              seed,
              ipoPrice,
              region
            }
          }
        `,
        variables: {
          tournamentId: this.tournamentId
        }
      });

      const teamData = response.data.tournamentTeams;
      this.tradableTeamInput = teamData.map((team) => {
        return {
          ...team,
          quantity: 0
        }
      });
      this.filteredTradableTeamInput = this.tradableTeamInput;
    },
    setTradableTeamQuantity(id) {
      const inputValue = this.$refs['quantityInput-' + id].value;
      const index = this.filteredTradableTeamInput.findIndex(team => team.id === id);
      this.filteredTradableTeamInput[index].quantity = inputValue;
    }
  },
  async created() {
    await this.getStocksForEntry();
    await this.setTradableTeamInput();
    this.startOfDayMillis = DateTime.fromJSDate(this.datePickerInput, { zone: "America/New_York" }).startOf('day').toMillis();
    this.$set(this.expiresHoursMinutes, 'hour', DateTime.fromMillis(this.startOfDayMillis).hour);
    this.$set(this.expiresHoursMinutes, 'minute', DateTime.fromMillis(this.startOfDayMillis).minute);
    this.offerFormInput = this.availableStocks.map((stock, index) => {
      return {
        id: index,
        ...stock,
        quantityOwned: stock.quantity,
        quantity: 0,
        sellPrice: stock.ipoPrice
      }
    });
    if(this.selectedOffer) {
      const index = this.offerFormInput.findIndex(stock => stock.tournamentTeamId === this.selectedOffer.tournamentTeamId);
      if(index >= 0) {
        this.offerFormInput[index].sellPrice = this.selectedOffer.currentAskPrice;
        this.selectedOfferFormInput = this.offerFormInput[index];
      }
    }
  }
}
</script>

<style scoped>
.submit-confirmation {
  padding-right: 20px;
}
</style>
