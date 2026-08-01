<template>
  <div v-if="isPageReady" class="content-container">
    <div v-if="!entries">
      You currently have no entries. Click <span class="link">here</span> to browse open contests.
    </div>
    <div v-else>
      <md-card>
        <md-card-header>
          <breadcrumbs :crumbs="breadcrumbCrumbs"></breadcrumbs>
          <div class="md-title">Transactions</div>
        </md-card-header>
        <div v-if="successMessage" class="alert-padding alert-success">
          {{successMessage}}
          <span @click="successMessage = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
        </div>
        <div v-if="serverError" class="alert-error text-center">
          {{serverError}}
          <span @click="serverError = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
        </div>

        <md-tabs v-if="selectedEntry" md-alignment="centered">
          <md-tab v-if="isTournamentIpoOpen" md-label="IPO" @click="showContent('ipo')"></md-tab>
          <md-tab md-label="Offers" @click="showContent('offers')"></md-tab>
          <md-tab v-if="!isTournamentIpoOpen" md-label="IPO" @click="showContent('ipo')"></md-tab>
        </md-tabs>

        <md-card-content>
          <div class="md-layout">
            <div class="md-layout-item"></div>
            <div class="md-layout-item md-large-size-50 md-medium-size-75 md-small-size-100">
              <entry-selector :entries="entries" v-model="selectedEntry"></entry-selector>
            </div>
            <div class="md-layout-item"></div>
          </div>
          <div v-if="selectedEntry">
            <div class="budget-container">
              <div>IPO Budget: {{ipoBudget | toCurrency}}</div>
              <div>IPO Budget Spent: {{selectedEntry.ipoCashSpent | toCurrency}}</div>
              <div>
                Secondary Market Budget:
                <span v-if="secondaryMarketBudget">{{secondaryMarketBudget | toCurrency}}</span>
                <span v-else>Unlimited</span>
              </div>
              <div>Secondary Market Spent: {{selectedEntry.secondaryMarketCashSpent | toCurrency}}</div>
              <div>Secondary Market Income: {{selectedEntry.secondaryMarketCashIncome | toCurrency}}</div>
            </div>
            <div v-if="contentToShow === 'ipo'">
              <ipo v-if="isTournamentIpoOpen" :tournament-id="selectedEntry.tournamentId" :entry-id="selectedEntry.id" :ipo-budget="ipoBudget" :ipo-cash-spent.sync="selectedEntry.ipoCashSpent"></ipo>
              <div v-else class="ipo-closed-container">IPO purchasing window is closed. To view your current holdings, click <a class="link" @click="goToPortfolio()">here</a></div>
            </div>
            <offers v-if="contentToShow === 'offers'" :tournament-id="selectedEntry.tournamentId" :entry-id="selectedEntry.id"></offers>
          </div>
        </md-card-content>
      </md-card>
    </div>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';
import Ipo from './Ipo.vue';
import Offers from './Offers.vue';
import EntrySelector from './EntrySelector.vue';
import Breadcrumbs from './Breadcrumbs.vue';
import { getLastEntryId, setLastEntryId } from '../utils/lastEntry';

export default {
  components: { Ipo, Offers, EntrySelector, Breadcrumbs },
  name: "Transactions",
  data() {
    return {
      isPageReady: false,
      entries: null,
      selectedEntry: null,
      contentToShow: null,
      isTournamentIpoOpen: false,
      serverError: null,
      ipoBudget: null,
      secondaryMarketBudget: null,
      tournamentName: null,
      leagueId: null,
      leagueName: null
    }
  },
  props: {
    entryId: {
      type: String
    },
    successMessage: {
      type: String
    }
  },
  watch: {
    async selectedEntry(newVal, oldVal) {
      if(newVal && newVal !== oldVal) {
        setLastEntryId(newVal.id);
        // TODO get tournament data to display isIpoOpen and maxBudget info
        try {
          const response = await apolloClient.query({
            fetchPolicy: 'no-cache',
            query: gql`
              query Tournament($id: ID!) {
                tournament(id: $id) {
                  id,
                  name,
                  leagueId,
                  isIpoOpen,
                  settings {
                    ipoBudget,
                    secondaryMarketBudget
                  }
                }
              }
            `,
            variables: {
              id: this.selectedEntry.tournamentId
            }
          });

          const tournamentData = response.data.tournament;
          this.isTournamentIpoOpen = tournamentData.isIpoOpen;
          this.ipoBudget = tournamentData.settings.ipoBudget;
          this.secondaryMarketBudget = tournamentData.settings.secondaryMarketBudget;
          this.tournamentName = tournamentData.name;
          this.leagueId = tournamentData.leagueId;
          this.leagueName = null;
          await this.fetchLeagueName();
          if(this.isTournamentIpoOpen) {
            this.contentToShow = 'ipo';
          } else {
            this.contentToShow = 'offers';
          }
        } catch(err) {
          if(err.graphQLErrors && err.graphQLErrors.length > 0) {
            this.serverError = err.graphQLErrors[0].message;
          } else {
            this.serverError = "Server Error";
          }
          return err;
        }
      }
    }
  },
  computed: {
    breadcrumbCrumbs() {
      const crumbs = [{ label: 'Home', to: { name: 'Home' } }];
      if(!this.selectedEntry) {
        crumbs.push({ label: 'IPO/Offers' });
        return crumbs;
      }
      if(this.leagueName && this.leagueId) {
        crumbs.push({ label: this.leagueName, to: { name: 'League', params: { leagueId: this.leagueId } } });
      }
      if(this.tournamentName) {
        // Tournament management is admin-only elsewhere in the app, so this
        // step is informational text, not a link, from a regular user's view.
        crumbs.push({ label: this.tournamentName });
      }
      crumbs.push({ label: this.selectedEntry.name });
      return crumbs;
    }
  },
  methods: {
    async fetchLeagueName() {
      if(!this.leagueId) { return; }
      try {
        const response = await apolloClient.query({
          fetchPolicy: 'no-cache',
          query: gql`
            query League($id: ID!) {
              league(id: $id) {
                id,
                name
              }
            }
          `,
          variables: {
            id: this.leagueId
          }
        });
        this.leagueName = response.data.league && response.data.league.name;
      } catch(err) {
        // Breadcrumb degrades gracefully to Tournament/Entry name if this fails.
        this.leagueName = null;
      }
    },
    async fetchUserEntries() {
      const email = sessionStorage.getItem('sports-exchange.email');
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query UserEntries($email: String!) {
            userEntries(email: $email) {
              id,
              name,
              tournamentId,
              tournament {
                name,
                isActive,
                masterSheetUpload,
                pricingSheetUpload,
                rulesSheetUpload,
                projectedPayoutSheetUpload,
                stockPayoutSheetUpload
              },
              ipoCashSpent,
              secondaryMarketCashSpent,
              secondaryMarketCashIncome
            }
          }
        `,
        variables: {
          email
        }
      });

      this.entries = response.data.userEntries;
      this.entries = this.entries.filter(entry => entry.tournament.isActive);

      if(!this.entryId) {
        if(this.entries.length === 1) {
          this.selectedEntry = this.entries[0];
        } else {
          const lastEntryId = getLastEntryId();
          if(lastEntryId) {
            this.selectedEntry = this.entries.find(entry => entry.id === lastEntryId) || null;
          }
        }
      } else {
        this.selectedEntry = this.entries.find(entry => entry.id === this.entryId);
      }
    },
    goToPortfolio() {
      this.$router.push({
        name: "Portfolio",
        params: {
          entryId: this.selectedEntry.id
        }
      });
    },
    showContent(content) {
      this.contentToShow = content;
    }
  },
  async created() {
    await this.fetchUserEntries();
    this.isPageReady = true;
  }
}
</script>

<style scoped>
.ipo-closed-container {
  padding-top: 30px;
}
</style>
