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
          <md-table-head>Email Confirmed</md-table-head>
          <md-table-head>Admin</md-table-head>
        </md-table-row>
        <md-table-row v-for="u in allUsers" :key="u.id">
          <md-table-cell>{{u.firstname}} {{u.lastname}}</md-table-cell>
          <md-table-cell>{{u.email}}</md-table-cell>
          <md-table-cell>{{u.username}}</md-table-cell>
          <md-table-cell>
            <span v-if="u.emailConfirmedAt" class="email-confirmed-yes">✓ {{ formatDate(new Date(u.emailConfirmedAt).getTime()) }}</span>
            <span v-else class="email-confirmed-no">⚠ Not confirmed</span>
          </md-table-cell>
          <md-table-cell>
            <md-switch v-model="u.isAdmin" @change="toggleAdmin(u)">{{u.isAdmin ? 'Admin' : 'User'}}</md-switch>
          </md-table-cell>
        </md-table-row>
      </md-table>
      <div v-else>Loading users...</div>
    </div>

    <div v-if="adminTab === 'tournaments' && selectedView === 'main'">
      <md-button @click="showCreateNewTournamentModal = true" class="md-raised md-primary">Create New Tournament</md-button>
      <div class="table-wrapper">
        <table class="tournaments-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>League</th>
              <th>Created At</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tournament in tournaments" :key="tournament.id">
              <td>{{ tournament.name }}</td>
              <td>{{ getLeagueName(tournament.leagueId) }}</td>
              <td>{{ formatDate(parseInt(tournament.createdAt)) }}</td>
              <td>
                <select class="status-select" :value="tournament.status" @change="changeStatus(tournament, $event.target.value)">
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="closed">closed</option>
                </select>
              </td>
              <td>
                <md-button @click="goToTournamentDetails(tournament)" class="md-raised md-primary btn-details">View Details/Edit</md-button>
              </td>
            </tr>
          </tbody>
        </table>
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
      this.tournaments = this.leagues
        .flatMap(league => league.tournaments)
        .sort((a, b) => parseInt(b.createdAt) - parseInt(a.createdAt));
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
    async changeStatus(tournament, newStatus) {
      if (newStatus === tournament.status) return;
      await apolloClient.mutate({
        mutation: gql`
          mutation UpdateTournamentStatus($tournamentId: ID!, $status: TournamentStatus!) {
            updateTournamentStatus(tournamentId: $tournamentId, status: $status) {
              id
              status
            }
          }
        `,
        variables: { tournamentId: tournament.id, status: newStatus }
      });
      tournament.status = newStatus;
      this.successMessage = `${tournament.name} status set to "${newStatus}".`;
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
              emailConfirmedAt
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
.admin-tabs {
  margin-bottom: 16px;
}

.users-tab {
  padding: 0 16px;
}

.users-tab h2 {
  margin-bottom: 16px;
}

.email-confirmed-yes {
  color: #17bd22;
}

.email-confirmed-no {
  color: #b58900;
}

.table-wrapper {
  overflow-x: auto;
  margin-top: 16px;
  border: 1px solid rgba(0, 0, 0, .12);
}

.tournaments-table {
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px;
  white-space: nowrap;
  width: 100%;
}

.tournaments-table th,
.tournaments-table td {
  padding: 10px 16px;
  text-align: left;
  border-bottom: 1px solid rgba(0, 0, 0, .12);
  vertical-align: middle;
}

.tournaments-table thead th {
  background: #f5f5f5;
  font-size: 12px;
  font-weight: 500;
}

.tournaments-table tbody tr:hover td {
  background: #f9f9f9;
}

.status-select {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  background: #fff;
}

.status-select:focus {
  outline: none;
  border-color: #487233;
}

.btn-details {
  margin: 0;
}
</style>
