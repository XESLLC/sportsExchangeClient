<template>
  <div v-if="isPageReady" class="content-container">
    <md-card>
      <md-card-header>
        <div class="md-title">{{entry.name}}</div>
      </md-card-header>

      <md-tabs md-alignment="centered">
        <md-tab md-label="Summary" @click="showContent('summary')"></md-tab>
        <md-tab md-label="Detail" @click="showContent('detail')"></md-tab>
        <md-tab md-label="IPO" @click="showContent('ipo')"></md-tab>
        <md-tab md-label="Offers"></md-tab>
        <md-tab md-label="Message Board" @click="showContent('messageBoard')"></md-tab>
      </md-tabs>

      <md-card-content>
        <div class="owners-info">
          <div>
            Owners: <span v-for="user in entryUsers" :key="user.id">{{user.firstname}} {{user.lastname}}</span>
          </div>
          <div>
            <!-- todo this will have to be reactive and passed in if we decide to keep this outside of ipo -->
            Remaining Balance: <span>{{entry.cash | toCurrency}}</span>
          </div>
        </div>
        <portfolio-summary v-if="contentToShow === 'summary'"></portfolio-summary>
        <portfolio-detail v-if="contentToShow === 'detail'" :entry-id="entryId"></portfolio-detail>
        <ipo v-if="contentToShow === 'ipo'" :tournament-id="tournamentId" :entry-id="entryId"></ipo>
        <message-board v-if="contentToShow === 'messageBoard'" :tournament-id="tournamentId"></message-board>
      </md-card-content>
    </md-card>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';
import PortfolioSummary from './PortfolioSummary.vue';
import PortfolioDetail from './PortfolioDetail.vue';
import Ipo from './Ipo.vue';
import MessageBoard from './MessageBoard.vue';

export default {
  components: { PortfolioSummary, PortfolioDetail, Ipo, MessageBoard },
  name: "Entry",
  data() {
    return {
      isPageReady: false,
      entry: null,
      contentToShow: 'summary',
      entryUsers: null,
      loggedInUser: null
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
    async fetchEntry() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query Entry($id: ID!) {
            entry(id: $id) {
              id,
              name,
              cash
            }
          }
        `,
        variables: {
          id: this.entryId
        }
      });

      this.entry = response.data.entry;
    },
    async fetchEntryUsers() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query usersByEntryId($entryId: ID!) {
            usersByEntryId(entryId: $entryId) {
              id,
              firstname,
              lastname,
              email
            }
          }
        `,
        variables: {
          entryId: this.entryId
        }
      });

      this.entryUsers = response.data.usersByEntryId;
      this.loggedInUser = this.entryUsers.reduce(user => {
        return user.email === sessionStorage.getItem('sports-exchange.email');
      });
    },
    showContent(content) {
      this.contentToShow = content;
    }
  },
  async created() {
    await this.fetchEntry();
    await this.fetchEntryUsers();
    this.isPageReady = true;
  }
}
</script>

<style scoped>
</style>