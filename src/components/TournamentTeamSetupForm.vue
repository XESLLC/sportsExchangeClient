<template>
  <div v-if="isPageReady">
    <div v-if="serverError" class="alert-error text-center">
      {{serverError}}
      <span @click="serverError = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
    </div>

    <div class="setup-help text-left">
      Pick from teams already known to this league by typing their name (matching
      entries will show up below the field), or type a brand-new team name to add
      it to the league. Existing teams already in this tournament are pre-filled below.
    </div>

    <div class="bulk-paste text-left">
      <label>Paste team names (one per line) to quickly add several rows at once</label>
      <textarea v-model="bulkPasteText" rows="4" class="bulk-paste-textarea"></textarea>
      <md-button class="md-raised" @click="addRowsFromBulkPaste">Add These Rows</md-button>
    </div>

    <datalist id="league-team-names-list">
      <option v-for="team in leagueTeams" :key="team.id" :value="team.name"></option>
    </datalist>

    <md-table v-model="rows" class="text-left">
      <md-table-row slot="md-table-row" slot-scope="{ item }">
        <md-table-cell md-label="Team">
          <input
            v-model="item.name"
            list="league-team-names-list"
            class="team-name-input"
            placeholder="Existing or new team name"
          >
          <span v-if="isExistingTeam(item.name)" class="existing-team-tag">existing</span>
          <span v-else-if="item.name && item.name.trim()" class="new-team-tag">new</span>
        </md-table-cell>
        <md-table-cell v-if="league.defaultSettings.useSeed" md-label="Seed">
          <input v-model="item.seed" class="seed-input" type="number" step="1" min="1" max="16">
        </md-table-cell>
        <md-table-cell v-if="league.defaultSettings.regions && league.defaultSettings.regions.length" md-label="Region">
          <select v-model="item.region">
            <option :value="null">--</option>
            <option v-for="region in league.defaultSettings.regions" :key="region" :value="region">{{region}}</option>
          </select>
        </md-table-cell>
        <md-table-cell md-label="Price">
          $<input v-model="item.price" class="price-input" type="number" step="0.01" min="0">
        </md-table-cell>
        <md-table-cell md-label="Remove">
          <span @click="removeRow(item.rowId)"><md-icon class="fa fa-times-circle link"></md-icon></span>
        </md-table-cell>
      </md-table-row>
    </md-table>

    <md-card-actions>
      <span class="link decorated-link add-row-link" @click="addEmptyRow">+ Add a team</span>
      <md-button :disabled="httpWait" @click="submit" class="md-raised md-primary" :class="{ 'btn-disabled' : httpWait }">
        Save Teams
        <md-progress-spinner v-if="httpWait" class="btn-spin" :md-diameter="20" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner>
      </md-button>
    </md-card-actions>
  </div>
  <div v-else>
    <md-progress-spinner class="spinner-primary" md-mode="indeterminate"></md-progress-spinner>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';

let nextRowId = 1;

export default {
  name: "TournamentTeamSetupForm",
  data() {
    return {
      isPageReady: false,
      league: null,
      leagueTeams: [],
      rows: [],
      bulkPasteText: "",
      serverError: null,
      httpWait: false
    }
  },
  props: {
    successCb: {
      type: Function
    },
    leagueId: {
      type: String
    },
    tournamentId: {
      type: String
    }
  },
  methods: {
    isExistingTeam(name) {
      if (!name || !name.trim()) { return false; }
      return this.leagueTeams.some(team => team.name === name.trim());
    },
    addEmptyRow() {
      this.rows.push({ rowId: nextRowId++, name: "", seed: null, region: null, price: 0 });
    },
    removeRow(rowId) {
      this.rows = this.rows.filter(row => row.rowId !== rowId);
    },
    addRowsFromBulkPaste() {
      const existingNames = new Set(this.rows.map(row => (row.name || "").trim()).filter(Boolean));
      const defaultRegion = this.league.defaultSettings.regions && this.league.defaultSettings.regions.length
        ? this.league.defaultSettings.regions[0]
        : null;

      this.bulkPasteText.split("\n").forEach((line) => {
        const name = line.trim();
        if (!name || existingNames.has(name)) { return; }
        existingNames.add(name);
        this.rows.push({ rowId: nextRowId++, name, seed: null, region: defaultRegion, price: 0 });
      });

      this.bulkPasteText = "";
    },
    async submit() {
      this.serverError = null;

      const teamNamesById = new Map(this.leagueTeams.map(team => [team.name, team.id]));
      const input = this.rows
        .filter(row => row.name && row.name.trim())
        .map((row) => {
          const trimmedName = row.name.trim();
          const existingTeamId = teamNamesById.get(trimmedName);

          return {
            existingTeamId: existingTeamId || null,
            newTeamName: existingTeamId ? null : trimmedName,
            seed: row.seed !== null && row.seed !== "" ? parseInt(row.seed, 10) : null,
            region: row.region || null,
            price: row.price !== null && row.price !== "" ? parseFloat(row.price) : null
          };
        });

      if (input.length === 0) {
        this.serverError = "Add at least one team before saving.";
        return;
      }

      this.httpWait = true;
      try {
        await apolloClient.mutate({
          fetchPolicy: 'no-cache',
          mutation: gql`
            mutation SetupTournamentTeams($tournamentId: ID!, $input: [TournamentTeamSetupInput!]!) {
              setupTournamentTeams(tournamentId: $tournamentId, input: $input) {
                id
              }
            }
          `,
          variables: {
            tournamentId: this.tournamentId,
            input
          }
        });
      } catch (err) {
        if (err.graphQLErrors && err.graphQLErrors.length > 0) {
          this.serverError = err.graphQLErrors[0].message;
        } else {
          this.serverError = "Server Error";
        }
        this.httpWait = false;
        return err;
      }

      this.httpWait = false;
      this.successCb();
    },
    async fetchLeague() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query League($id: ID!) {
            league(id: $id) {
              id
              name
              defaultSettings {
                regions
                useSeed
              }
            }
          }
        `,
        variables: {
          id: this.leagueId
        }
      });

      this.league = response.data.league;
    },
    async fetchLeagueTeams() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query GetTeamsByLeagueId($leagueId: ID!) {
            getTeamsByLeagueId(leagueId: $leagueId) {
              id,
              name
            }
          }
        `,
        variables: {
          leagueId: this.leagueId
        }
      });

      this.leagueTeams = response.data.getTeamsByLeagueId;
    },
    async fetchCurrentTournamentTeams() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query TournamentTeams($tournamentId: ID!) {
            tournamentTeams(tournamentId: $tournamentId) {
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

      this.rows = response.data.tournamentTeams.map((team) => {
        return {
          rowId: nextRowId++,
          name: team.teamName,
          seed: team.seed,
          region: team.region,
          price: team.ipoPrice
        };
      });
    }
  },
  async created() {
    await this.fetchLeague();
    await this.fetchLeagueTeams();
    await this.fetchCurrentTournamentTeams();
    if (this.rows.length === 0) {
      this.addEmptyRow();
    }
    this.isPageReady = true;
  }
}
</script>

<style scoped>
.setup-help {
  margin-bottom: 12px;
  font-size: 0.9em;
  color: #555;
}

.bulk-paste {
  margin-bottom: 16px;
}

.bulk-paste-textarea {
  width: 100%;
  font-family: inherit;
}

.team-name-input {
  width: 220px;
}

.seed-input {
  width: 60px;
}

.price-input {
  width: 70px;
}

.existing-team-tag {
  color: #2e7d32;
  font-size: 0.8em;
  margin-left: 6px;
}

.new-team-tag {
  color: #1565c0;
  font-size: 0.8em;
  margin-left: 6px;
}

.add-row-link {
  margin-right: 16px;
}
</style>
