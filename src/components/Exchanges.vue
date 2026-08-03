<template>
  <div v-if="isPageReady" class="content-container">
    <md-card>
      <!-- <div v-if="successMessage" class="alert-success">
        {{successMessage}}
        <span @click="successMessage = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
      </div> -->
      <md-card-header>
        <div class="md-title">Exchanges</div>
      </md-card-header>

      <md-card-content>
        <div v-if="visibleTournaments && visibleTournaments.length > 0">
          <md-table v-model="visibleTournaments" class="web-table text-left">
            <md-table-row slot="md-table-row" slot-scope="{ item }">
              <md-table-cell md-label="Tournament Name" md-sort-by="name">
                <span class="tournament-link link" @click="goToTournamentHome(item.id)">{{ item.leagueName }} - {{ item.name }}</span>
              </md-table-cell>
              <md-table-cell v-if="!isAdmin" md-label="My Entries">
                <div v-if="userHasTournamentEntries(item.id)">
                  <md-button class="md-raised md-secondary" @click="goToEntry(userHasTournamentEntries(item.id))">View Entry</md-button>
                </div>
                <div v-else>
                  Not Entered
                </div>
              </md-table-cell>
              <md-table-cell md-label="New Entry">
                <md-button v-if="item.status === 'active'" class="md-raised md-primary" @click="showJoinTournamentForm(item)">Create New Entry</md-button>
                <span v-else class="tournament-closed-label">Closed</span>
              </md-table-cell>
              <md-table-cell md-label="Created At" md-sort-by="createdAt">{{getReadableDate(item.createdAt)}}</md-table-cell>
            </md-table-row>
          </md-table>
          <md-table class="mobile-table">
            <md-table-row v-for="tournament in visibleTournaments" :key="tournament.id">
              <md-table-cell>
                <div class="mobile-row">
                  <div class="mobile-header">Tournament Name</div>
                  <div class="tournament-link link" @click="goToTournamentHome(tournament.id)">{{tournament.name}}</div>
                </div>

                <div class="mobile-row" v-if="userHasTournamentEntries(tournament.id)">
                  <div class="mobile-header">My Entries</div>
                  <div v-if="userHasTournamentEntries(tournament.id)">
                    <md-button class="md-raised md-secondary" @click="goToEntry(userHasTournamentEntries(tournament.id))">View Entry</md-button>
                  </div>
                </div>

                <div class="mobile-row">
                  <div class="mobile-header">New Entry</div>
                  <div>
                    <md-button v-if="tournament.status === 'active'" class="md-raised md-primary" @click="showJoinTournamentForm(tournament)">Create New Entry</md-button>
                    <span v-else class="tournament-closed-label">Closed</span>
                  </div>
                </div>

                <div class="mobile-row">
                  <div class="mobile-header">Created At</div>
                  <div>{{getReadableDate(tournament.createdAt)}}</div>
                </div>
              </md-table-cell>
            </md-table-row>
          </md-table>
        </div>
        <div v-else>
          There are currently no tournaments to show. Please contact your commissioner to add a new tournament
        </div>
      </md-card-content>
    </md-card>
    
    <md-dialog v-if="showCreateTournamentEntryModal" :md-active.sync="showCreateTournamentEntryModal" :md-fullscreen="false">
      <md-dialog-title class="text-center">Create Entry for {{selectedTournament.name}}</md-dialog-title>
      <md-dialog-content>
        <entry-form :form-type="'create'" :success-cb="createEntrySuccessCb" :tournament-id="selectedTournament.id"></entry-form>
      </md-dialog-content>
    </md-dialog>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';
import EntryForm from './EntryForm.vue';

export default {
  components: { EntryForm },
  name: "Exchanges",
  data() {
    return {
      isPageReady: false,
      league: null,
      showCreateTournamentModal: false,
      showCreateTeamsModal: false,
      showCreateTournamentEntryModal: false,
      // successMessage: null,
      tournaments: null,
      selectedTournament: null,
      userEntries: null,
      tournamentEntries: {},
      visibleTournaments: null
    }
  },
  props: {
    leagueId: {
      type: String
    },
    isAdmin: {
      type: Boolean
    }
  },
  methods: {
    async fetchAllTournaments() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query Tournaments {
            tournaments {
              id
              name,
              leagueName,
              createdAt,
              status,
              masterSheetUpload,
              pricingSheetUpload,
              rulesSheetUpload,
              projectedPayoutSheetUpload,
              stockPayoutSheetUpload
            }
          }
        `,
      });

      this.tournaments = response.data.tournaments;
      // Inactive tournaments stay hidden entirely (unchanged from before).
      // Closed tournaments remain visible so people can see history - they
      // just won't have a "Create New Entry" option (see template above).
      this.visibleTournaments = this.tournaments.filter(tournament => tournament.status !== 'inactive');
    },
    goToEntry(entryId) {
      this.$router.push({
        name: "Portfolio",
        params: {
          entryId
        }
      });
    },
    goToTournamentHome(tournamentId) {
      this.$router.push({ name: 'TournamentHome', params: { tournamentId } });
    },
    goToTournament(tournamentId) {
      if(this.isAdmin) {
        this.$emit(`update:selected-view`, 'tournament');
        this.$emit(`update:league-id`, this.leagueId);
        this.$emit(`update:tournament-id`, tournamentId);
      }
    },
    async getTournamentEntries() {
      if(this.tournaments && this.tournaments.length > 0) {
        for(let tournament of this.tournaments) {
          const response = await apolloClient.query({
            fetchPolicy: 'no-cache',
            query: gql`
              query EntriesByTournamentId($tournamentId: ID!) {
                entriesByTournamentId(tournamentId: $tournamentId) {
                  id,
                  name,
                  tournamentId
                }
              }
            `,
            variables: {
              tournamentId: tournament.id
            }
          });

          const entries = response.data.entriesByTournamentId;

          this.tournamentEntries[tournament.id] = entries;
        }
      }
    },
    async fetchUserEntries() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query UserEntries($email: String!) {
            userEntries(email: $email) {
              id,
              name,
              tournamentId
            }
          }
        `,
        variables: {
          email: sessionStorage.getItem('sports-exchange.email')
        }
      });

      this.userEntries = response.data.userEntries;
    },
    getReadableDate(timestamp) {
      const date = new Date(parseInt(timestamp));
      return `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()}`;
    },
    // async createTeamsSuccessCb() {
    //   this.showCreateTeamsModal = false;
    //   this.successMessage = "Successfully created new tournament teams!";
    // },
    async createEntrySuccessCb(entryId) {
      // this.showCreateTournamentEntryModal = false;
      // this.selectedTournament = null;
      // await this.fetchUserEntries();
      // await this.getTournamentEntries();
      const successMessgae = "Successfully registered entry for tournament!"
      // push to ipo with selected entry context and successmessage
      this.$router.push({ 
        name: "Transactions",
        params: {
          entryId,
          successMessgae
        }
      });
    },
    showJoinTournamentForm(selectedTournament) {
      this.selectedTournament = selectedTournament;
      this.showCreateTournamentEntryModal = true;
    },
    // async successCb() {
    //   this.showCreateTournamentModal = false;
    //   this.successMessage = "Successfully created new tournament!";
    // },
    userHasTournamentEntries(tournamentId) {
      const tournamentEntries = this.tournamentEntries[tournamentId];

      if((this.userEntries && this.userEntries.length > 0) && (tournamentEntries && tournamentEntries.length > 0)) {
        const userEntryIds = this.userEntries.map(userEntry => userEntry.id);
        const intersectingUserTournamentEntries = tournamentEntries.filter(entry => userEntryIds.includes(entry.id));
        if(intersectingUserTournamentEntries.length > 0) {
          return intersectingUserTournamentEntries[0].id;
        }
      }

      return false;
    }
  },
  async created() {
    await this.fetchAllTournaments();
    await this.fetchUserEntries();
    await this.getTournamentEntries();
    this.isPageReady = true;
  }
}
</script>

<style scoped>
.web-table {
  display: block;
}

.mobile-table {
  display: none;
}

.mobile-header {
  font-weight: bold;
}

.tournament-link {
  font-weight: bold;
  color: #487233;
  text-decoration: underline;
}

.tournament-closed-label {
  color: #888;
  font-style: italic;
}

.mobile-row {
  padding-top: 5px;
  padding-bottom: 5px;
}

@media screen and (max-width: 720px) {
  .web-table {
    display: none;
  }

  .mobile-table {
    display: block;
  }
}
</style>