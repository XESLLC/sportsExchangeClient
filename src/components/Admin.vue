<template>
  <div v-if="isPageReady">
    <!-- <div @click="importNewLeague()">import league</div> -->
    <!-- <leagues v-if="selectedView === 'main'" :is-admin="true" :selected-view.sync="selectedView" :league-id.sync="leagueId"></leagues>
    <league v-if="selectedView === 'league'" :is-admin="true" :selected-view.sync="selectedView" :league-id.sync="leagueId" :tournament-id.sync="tournamentId"></league>
    <tournament v-if="selectedView === 'tournament'" :is-admin="true" :selected-view.sync="selectedView" :league-id.sync="leagueId" :tournament-id.sync="tournamentId"></tournament> -->
    <h1>Admin</h1>
    <div v-if="successMessage" class="alert-success">
      {{successMessage}}
      <span @click="successMessage = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
    </div>
    <div class="admin-tabs">
      <md-button :class="{ 'md-raised md-primary': adminTab === 'tournaments' }" @click="adminTab = 'tournaments'">Tournaments</md-button>
      <md-button :class="{ 'md-raised md-primary': adminTab === 'users' }" @click="adminTab = 'users'">Users</md-button>
    </div>

    <div v-if="adminTab === 'users'" class="users-tab">
      <h2>User Access Management</h2>
      <md-table v-if="allUsers">
        <md-table-row>
          <md-table-head>Name</md-table-head>
          <md-table-head>Email</md-table-head>
          <md-table-head>Username</md-table-head>
          <md-table-head>Admin</md-table-head>
        </md-table-row>
        <md-table-row v-for="u in allUsers" :key="u.id">
          <md-table-cell>{{u.firstname}} {{u.lastname}}</md-table-cell>
          <md-table-cell>{{u.email}}</md-table-cell>
          <md-table-cell>{{u.username}}</md-table-cell>
          <md-table-cell>
            <md-switch v-model="u.isAdmin" @change="toggleAdmin(u)">{{u.isAdmin ? 'Admin' : 'User'}}</md-switch>
          </md-table-cell>
        </md-table-row>
      </md-table>
      <div v-else>Loading users...</div>
    </div>

    <div v-if="adminTab === 'tournaments' && selectedView === 'main'">
      <md-button @click="showCreateNewTournamentModal = true" class="md-raised md-primary">Create New Tournament</md-button>
      <div class="content-container">
        <md-card class="tournament-card" v-for="tournament in tournaments" v-bind:key="tournament.id">
          <div>
            <md-card-header>
              <div class="md-title">{{tournament.name}}</div>
            </md-card-header>
            <md-card-content>
              <div class="md-layout">
                <div class="md-layout-item">League: {{getLeagueName(tournament.leagueId)}}</div>
              </div>
              <div class="md-layout">
                <div class="md-layout-item">Created At: {{formatDate(parseInt(tournament.createdAt))}}</div>
              </div>
              <div class="md-layout">
                <div class="md-layout-item">Status: {{tournament.status}}</div>
              </div>
              <!-- <div class="md-layout">
                <div class="md-layout-item">Number of Entries</div>
              </div>
              <div class="md-layout">
                <div class="md-layout-item">Number of Tournament Teams</div>
              </div> -->
              <div>
                <md-button @click="goToTournamentDetails(tournament)" class="md-raised md-primary">View Details/Edit</md-button>
              </div>
            </md-card-content>
          </div>
        </md-card>
      </div>
    </div>
    <tournament v-if="adminTab === 'tournaments' && selectedView === 'tournamentDetail'" :selected-view.sync="selectedView" :selected-entry.sync="selectedEntry" :league-id.sync="selectedLeagueId" :tournament-id.sync="selectedTournamentId"></tournament>
    <edit-entry-data v-if="adminTab === 'tournaments' && selectedView === 'editEntry'" :selected-view.sync="selectedView" :selected-entry="selectedEntry" :league-id.sync="selectedLeagueId" :tournament-id.sync="selectedTournamentId"></edit-entry-data>

    <md-dialog :md-active.sync="showCreateNewTournamentModal">
      <md-dialog-title class="text-center">Create Tournament</md-dialog-title>
      <md-dialog-content>
        <tournament-form :form-type="'new'" :success-cb="createTournamentSuccessCb" :selectable-leagues="leagues"></tournament-form>
      </md-dialog-content>
    </md-dialog>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';
import Tournament from './Tournament.vue';
import TournamentForm from './TournamentForm.vue';
import EditEntryData from './EditEntryData.vue';

export default {
  components: { Tournament, TournamentForm, EditEntryData },
  name: "Admin",
  data() {
    return {
      isPageReady: false,
      adminTab: 'tournaments',
      selectedView: "main",
      leagues: null,
      tournaments: null,
      allUsers: null,
      selectedLeagueId: null,
      selectedTournamentId: null,
      showCreateNewTournamentModal: false,
      successMessage: null,
      selectedEntry: null
    }
  },
  props: {
    entryId: {
      type: String
    }
  },
  methods: {
    async importNewLeague() {
      await apolloClient.mutate({
        fetchPolicy: 'no-cache',
        mutation: gql`
          mutation ImportLeague($leagueName: String!) {
            importLeague(leagueName: $leagueName) {
              id,
              name
            }
          }
        `,
        variables: {
          leagueName: "nfl"
        }
      });
    },
    async fetchAllLeagues() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query Leagues {
            leagues {
              id
              name,
              defaultSettings {
                ipoBudget,
                secondaryMarketBudget,
                milestones {
                  name
                },
                regions
              },
              tournaments {
                id,
                name,
                isIpoOpen,
                leagueId,
                createdAt,
                status,
                masterSheetUpload,
                pricingSheetUpload,
                rulesSheetUpload,
                projectedPayoutSheetUpload,
                stockPayoutSheetUpload
              }
            }
          }
        `,
      });

      this.leagues = response.data.leagues;
      this.tournaments = this.leagues.flatMap(league => league.tournaments);
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
    goToTournamentDetails(tournament) {
      this.selectedLeagueId = tournament.leagueId;
      this.selectedTournamentId = tournament.id;
      this.selectedView = "tournamentDetail";
    },
    getLeagueName(leagueId) {
      const selectedLeague = this.leagues.find(league => league.id === leagueId);
      return selectedLeague.name;
    },
    showContent(content) {
      this.contentToShow = content;
    },
    async createTournamentSuccessCb() {
      this.showCreateNewTournamentModal = false;
      this.successMessage = "Successfully created new tournament!";
      await this.fetchAllLeagues();
    },
    async fetchAllUsers() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query Users {
            users {
              id
              firstname
              lastname
              email
              username
              isAdmin
            }
          }
        `
      });
      this.allUsers = response.data.users;
    },
    async toggleAdmin(user) {
      // v-model already flipped user.isAdmin — use that as the new value
      const newValue = user.isAdmin;
      await apolloClient.mutate({
        mutation: gql`
          mutation SetUserAdmin($email: String!, $isAdmin: Boolean!) {
            setUserAdmin(email: $email, isAdmin: $isAdmin) {
              email
              isAdmin
            }
          }
        `,
        variables: { email: user.email, isAdmin: newValue }
      });
      this.successMessage = `${user.email} is now ${newValue ? 'an Admin' : 'a regular user'}.`;
    }
  },
  async created() {
    await this.fetchAllLeagues();
    await this.fetchAllUsers();
    this.isPageReady = true;
  }
}
</script>

<style scoped>
.custom-select {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid black;
  width: 100%;
}

.custom-select select {
  padding-left: 10px;
  background-color: transparent;
  font-size: 18px;
  outline: none;
  appearance: none;
  cursor: pointer;
}

.custom-select-wrapper {
  position: relative;
  user-select: none;
  width: 100%;
}

.tournament-card {
  margin-bottom: 20px;
}

.admin-tabs {
  margin-bottom: 16px;
}

.users-tab {
  padding: 0 16px;
}

.users-tab h2 {
  margin-bottom: 16px;
}
</style>
