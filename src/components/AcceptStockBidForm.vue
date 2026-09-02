<template>
  <div>
    <div>
      <h3>You Give</h3>
      <div class="md-layout">
        Team Name: {{acceptStockBidDataInput.teamName}}
      </div>
      <div class="md-layout">
        Quantity: {{acceptStockBidDataInput.quantity}}
      </div>
    </div>
    <div>
      <h3>You Get</h3>
      <div class="tradable-teams" v-for="tradableTeam in acceptStockBidDataInput.tradableTeams" :key="tradableTeam.tournamentTeamId">
        <div class="md-layout">
          Team Name: {{tradableTeam.teamName}}
        </div>
        <div class="md-layout">
          Quantity: {{tradableTeam.quantity}}
        </div>
      </div>
    </div>
    <div v-if="errorMessage" class="error text-center">
      {{errorMessage}}
    </div>
    <md-card-actions>
      <md-button :disabled="httpWait" @click="submit" class="md-primary md-raised" :class="{ 'btn-disabled' : httpWait }">
        Accept Trade
        <md-progress-spinner v-if="httpWait" class="btn-spin" :md-diameter="20" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner>
      </md-button>
    </md-card-actions>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';

export default {
  name: "AcceptStockBidForm",
  data() {
    return {
      errorMessage: null,
      httpWait: false,
      acceptStockBidDataInput: null
    }
  },
  props: {
    acceptStockBidSuccessCb: {
      type: Function
    },
    entryId: {
      type: String
    },
    acceptStockBidData: {
      type: Object
    }
  },
  methods: {
    async submit() {
      this.httpWait = true;
      try {
        await apolloClient.mutate({
          mutation: gql`
            mutation AcceptStockBid($bidId: ID!, $entryId: ID!) {
              acceptStockBid(bidId: $bidId, entryId: $entryId) {
                id
              }
            }
          `,
          variables: {
            bidId: this.acceptStockBidDataInput.id,
            entryId: this.entryId
          }
        });
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
      this.acceptStockBidSuccessCb();
    }
  },
  async created() {
    this.acceptStockBidDataInput = {
      id: this.acceptStockBidData.id,
      teamName: this.acceptStockBidData.teamName,
      quantity: this.acceptStockBidData.quantity,
      tradableTeams: this.acceptStockBidData.tradableTeams
    }
  }
}
</script>

<style scoped>
.tradable-teams {
  padding-bottom: 10px;
}
</style>
