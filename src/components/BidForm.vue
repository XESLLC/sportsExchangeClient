<template>
  <div>
    <div>
      <h3 class="label"><span v-if="formType === 'new'">Select a </span>Stock for Bid</h3>
      <div v-if="formType === 'new'" class="custom-select-wrapper">
        <select class="custom-select" name="basic-dropdown" v-model="selectedBidInput">
          <option :value="null">Select Stock</option>
          <option v-for="stock in bidInput" :key="stock.id" :value="stock">{{stock.teamName}}</option>
        </select>
      </div>
      <div v-else>
        {{selectedBid.teamName}}
      </div>
    </div>
    <div v-if="selectedBidInput">
      <div class="md-layout">
        <md-field>
          <label>Quantity</label>
          <md-input v-model="selectedBidInput.quantity" type="number" min="1"></md-input>
        </md-field>
      </div>
      <h3 class="label">Select Bid Type</h3>
      <select class="custom-select" name="basic-dropdown" v-model="bidType">
        <option value="CASH">Cash</option>
        <option value="STOCK">Stock</option>
      </select>
      <div class="md-layout" v-if="bidType === 'CASH'">
        <md-field>
          <label>Max Buy Price</label>
          <currency-input :currency-to-format.sync="selectedBidInput.maxBuyPrice" :allows-negative="false"></currency-input>
        </md-field>
      </div>
      <div class="md-layout" v-if="bidType === 'STOCK'">
        <div class="setup-help text-left">Choose which of your own teams you'll pay with.</div>
        <md-table v-model="filteredTradableTeamInput" md-sort="teamName" class="text-left" md-sort-order="asc">
          <md-table-row slot="md-table-row" slot-scope="{ item }">
            <md-table-cell md-label="Team" md-sort-by="teamName">{{ item.teamName }}</md-table-cell>
            <md-table-cell md-label="Quantity">
              <input :ref="'quantityInput-' + item.tournamentTeamId" @change="setTradableTeamQuantity(item.tournamentTeamId)" @keyup="setTradableTeamQuantity(item.tournamentTeamId)" :value="item.quantity" class="quantity-input" type="number" step="1" min="0" :max="item.quantityOwned">
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
      <span class="submit-confirmation" v-if="canSubmit">
        Are you sure you want to submit this bid?
      </span>
      <md-button :disabled="httpWait" v-if="canSubmit" class="md-primary" :class="{ 'btn-disabled' : httpWait }" @click="submit">
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
  name: "BidForm",
  data() {
    let expiresDate = DateTime.fromObject({ zone: "America/New_York" }).endOf('day');
    const now = DateTime.fromObject({ zone: "America/New_York" });
    return {
      disabledDates: date => {
        const beginningOfDay = now.startOf('day');
        const dateTime = date.getTime();
        return dateTime < beginningOfDay;
      },
      tournamentTeamData: null,
      bidInput: [],
      errorMessage: null,
      selectedBidInput: null,
      datePickerInput: expiresDate.toJSDate(),
      httpWait: false,
      expiresHoursMinutes: {},
      startOfDayMillis: null,
      expiresDateInput: null,
      bidType: "CASH",
      availableStocks: null,
      tradableTeamInput: [],
      filteredTradableTeamInput: []
    }
  },
  computed: {
    canSubmit() {
      if(!this.selectedBidInput || !this.selectedBidInput.quantity || this.selectedBidInput.quantity <= 0) {
        return false;
      }
      if(this.bidType === 'CASH') {
        return !!this.selectedBidInput.maxBuyPrice;
      }
      return this.filteredTradableTeamInput.some(team => team.quantity > 0);
    }
  },
  props: {
    formType: {
      type: String
    },
    createNewBidSuccessCb: {
      type: Function
    },
    tradeAcceptedCb: {
      type: Function
    },
    entryId: {
      type: String
    },
    tournamentId: {
      type: String
    },
    selectedBid: {
      type: Object
    },
    closeCb: {
      type: Function
    }
  },
  watch: {
    selectedBidInput(val) {
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
    setTradableTeamQuantity(tournamentTeamId) {
      const inputValue = this.$refs['quantityInput-' + tournamentTeamId].value;
      const index = this.filteredTradableTeamInput.findIndex(team => team.tournamentTeamId === tournamentTeamId);
      this.filteredTradableTeamInput[index].quantity = inputValue;
    },
    async fetchTournamentTeams() {
      const response = await apolloClient.query({
      fetchPolicy: 'no-cache',
        query: gql`
          query TournamentTeams($tournamentId: ID!) {
            tournamentTeams(tournamentId: $tournamentId) {
              id,
              teamId,
              teamName
            }
          }
        `,
        variables: {
          tournamentId: this.tournamentId
        }
      });

      this.tournamentTeamData = response.data.tournamentTeams;
    },
    async submit() {
      const nowMilliseconds = DateTime.fromObject({ zone: "America/New_York" }).toMillis();
      if(this.expiresDateInput < nowMilliseconds) {
        this.errorMessage = "Expires date must be in the future";
        return;
      }

      if(this.validateBidInput()) {
        this.httpWait = true;
        const expiresAt = DateTime.fromMillis(this.expiresDateInput).toJSDate().getTime();
        const input = {
          entryId: this.entryId,
          tournamentTeamId: this.selectedBidInput.id,
          quantity: parseInt(this.selectedBidInput.quantity),
          expiresAt,
          price: null,
          tradableTeams: null
        };

        if(this.bidType === 'CASH') {
          input.price = parseFloat(this.selectedBidInput.maxBuyPrice);
        } else {
          input.tradableTeams = this.filteredTradableTeamInput
            .filter(team => team.quantity > 0)
            .map(team => ({
              tournamentTeamId: team.tournamentTeamId,
              teamName: team.teamName,
              quantity: parseInt(team.quantity),
              price: 0
            }));

          if(input.tradableTeams.length < 1) {
            this.errorMessage = "At least one team must be selected to pay with";
            this.httpWait = false;
            return;
          }
        }
        try {
          const response = await apolloClient.mutate({
            mutation: gql`
              mutation CreateEntryBid($input: NewEntryBidInput!) {
                createEntryBid(input: $input) {
                  entryId,
                  tournamentTeamId,
                  price,
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

          const bidData = response.data.createEntryBid;
          if(bidData.trades && bidData.trades.length > 0) {
            const numAccepted = bidData.trades.length/2;
            this.tradeAcceptedCb("BID", numAccepted, this.selectedBidInput.quantity);
          } else {
            this.createNewBidSuccessCb();
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
      }
    },
    validateBidInput() {
      if(!this.expiresDateInput) {
        this.errorMessage = "Must select an expires date";
        return false;
      }
      return true;
    }
  },
  async created() {
    await this.fetchTournamentTeams();
    await this.getStocksForEntry();
    this.tradableTeamInput = this.availableStocks.map((stock) => {
      return {
        ...stock,
        quantityOwned: stock.quantity,
        quantity: 0
      }
    });
    this.filteredTradableTeamInput = this.tradableTeamInput;
    this.startOfDayMillis = DateTime.fromJSDate(this.datePickerInput, { zone: "America/New_York" }).startOf('day').toMillis();
    this.$set(this.expiresHoursMinutes, 'hour', DateTime.fromMillis(this.startOfDayMillis).hour);
    this.$set(this.expiresHoursMinutes, 'minute', DateTime.fromMillis(this.startOfDayMillis).minute);
    this.bidInput = this.tournamentTeamData.map((teamData) => {
      return {
        ...teamData,
        maxBuyPrice: 0,
        quantity: 0
      }
    });
    if(this.selectedBid) {
      const index = this.bidInput.findIndex(stock => stock.id === this.selectedBid.tournamentTeamId);
      if(index >= 0) {
        this.bidInput[index].maxBuyPrice = this.selectedBid.price;
        this.selectedBidInput = this.bidInput[index];
      }
    }
  }
}
</script>

<style scoped>
.submit-confirmation {
  padding-right: 20px;
}

.setup-help {
  margin: 8px 0;
  font-size: 0.9em;
  color: #555;
}

.quantity-input {
  width: 60px;
}
</style>