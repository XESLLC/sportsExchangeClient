<template>
  <div>
    <div class="md-layout">
      <div class="md-layout-item"></div>
      <div class="md-layout-item md-large-size-50 md-medium-size-50 md-small-size-75 md-xsmall-size-100">
        <div v-if="serverError" class="alert-error text-center">
          {{serverError}}
          <span @click="serverError = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
        </div>
        <div v-if="formType === 'new'" class="custom-select-wrapper">
          <h4>League</h4>
          <select class="custom-select" name="basic-dropdown" v-model="selectedLeague">
            <option :value="null">Create New League</option>
            <option v-for="league in selectableLeagues" :key="league.id" :value="league">{{league.name}}</option>
          </select>
        </div>
        <div v-else>
        </div>
        <md-field>
          <label>Tournament Name</label>
          <md-input v-model="tournamentInputName"></md-input>
          <span v-if="inputError === 'name'" class="error form-error">Please enter a tournament name</span>
        </md-field>
        <!-- <md-field>
          <label>*IPO Budget</label>
          <md-input v-model="tournamentInputIpoBudget" type="number"></md-input>
          <span v-if="inputError === 'ipoBudget'" class="error form-error">Please enter an ipo budget</span>
        </md-field>
        <md-field>
          <label>*Secondary Market Budget</label>
          <md-input v-model="tournamentInputSecondaryMarketBudget" type="number"></md-input>
        </md-field>
        *leave budgets blank to set unlimited budget -->
        <div>
          <h4>Tournament Teams</h4>
          <div v-if="!selectedLeague">
            <md-field v-for="team in newLeagueTeams" :key="team.id">
              <label>Name</label>
              <md-input v-model="team.name"></md-input>
              <span v-if="team.id === newLeagueTeams.length" @click="addTeamRow(team.id + 1)"><md-icon class="fa fa-plus link"></md-icon></span>
              <span v-if="inputError === 'name'" class="error form-error">Please enter a team name</span>
            </md-field>
          </div>
          <div v-else>
            <md-table v-model="tournamentInputTeams" class="text-left">
              <md-table-row slot="md-table-row" slot-scope="{ item }">
                <md-table-cell md-label="Team" md-sort-by="name">{{ item.name }}</md-table-cell>
                <md-table-cell md-label="Price" md-sort-by="price">
                  <span>$</span><input :ref="'priceInput-' + item.id" @change="updateInput(item.id)" @paste="handlePricePaste($event, item.id)" class="price-input" type="number" step="1" min="0" max="" :value="item.price">
                </md-table-cell>
                <md-table-cell v-if="selectedLeague.defaultSettings.useSeed" md-label="Seed" md-sort-by="seed">
                  <input :ref="'seedInput-' + item.id" @change="updateInput(item.id)" class="seed-input" type="number" step="1" min="1" max="" :value="item.seed">
                </md-table-cell>
                <md-table-cell v-if="selectedLeague.defaultSettings.regions && selectedLeague.defaultSettings.regions.length" md-label="Region">
                  <select :ref="'regionInput-' + item.id" @change="updateInput(item.id)">
                    <option v-for="region in selectedLeague.defaultSettings.regions" :key="region" :value="region">{{region}}</option>
                  </select>
                </md-table-cell>
              </md-table-row>
            </md-table>
          </div>
        </div>
      </div>
      <div class="md-layout-item"></div>
    </div>
    <div class="md-layout">
      <div class="md-layout-item"></div>
        <md-button :disabled="httpWait" v-if="selectedLeague" @click="createTournament()" class="md-raised md-primary" :class="{ 'btn-disabled' : httpWait }">
          Submit
          <md-progress-spinner v-if="httpWait" class="btn-spin" :md-diameter="20" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner>
        </md-button>
        <div v-else>
          <div class="error">Feature not yet built in fully</div>
          <md-button disabled>Submit</md-button>
        </div>
      <div class="md-layout-item"></div>
    </div>
  </div>
</template>

<script>
/* eslint-disable */
import { apolloClient } from "../main";
import gql from 'graphql-tag';

export default {
  name: "TournamentForm",
  data() {
    return {
      selectedLeague: null,
      tournamentInputName: "",
      tournamentInputIpoBudget: null,
      tournamentInputSecondaryMarketBudget: null,
      tournamentInputMilestones: null,
      tournamentInputTeams: [],
      inputError: null,
      serverError: null,
      newLeagueTeams: [{
        id: 1,
        name: ""
      }],
      httpWait: false
    }
  },
  props: {
    formType: {
      type: String
    },
    successCb: {
      type: Function
    },
    selectableLeagues: {
      type: Array
    }
  },
  watch: {
    async selectedLeague(val) {
      if(val) {
        // TODO fetch teams for league and add them as tournamentInput
        await this.fetchTeamsForLeague();
        const defaultSettings = val.defaultSettings;
        this.tournamentInputIpoBudget = defaultSettings.ipoBudget;
        this.tournamentInputSecondaryMarketBudget = defaultSettings.secondaryMarketBudget;
        this.tournamentInputMilestones = defaultSettings.milestones.map((milestone) => {
          return {
            name: milestone.name
          }
        });
        if(val.defaultSettings.regions && val.defaultSettings.regions.length) {
          for(let team of this.tournamentInputTeams) {
            team.region = val.defaultSettings.regions[0];
          }
        }
      } else {
        this.tournamentInputIpoBudget = null;
        this.tournamentInputSecondaryMarketBudget = null;
      }
    }
  },
  methods: {
    addTeamRow(newId) {
      this.newLeagueTeams.push({
        id: newId,
        name: ""
      })
    },
    async createTournament() {
      this.httpWait = true;
      const tournamentInput = {
        name: this.tournamentInputName,
        leagueId: this.selectedLeague.id
      }
      try {
        const response = await apolloClient.mutate({
          mutation: gql`
            mutation CreateTournament($input: TournamentInput!) {
              createTournament(input: $input) {
                id,
                name
              }
            }
          `,
          variables: {
            input: tournamentInput
          }
        });

        const createdTournament = response.data.createTournament;
        if(this.tournamentInputTeams.length > 0) {
          await this.createTournamentTeams(createdTournament.id);
        }
      } catch(err) {
        if(err.graphQLErrors && err.graphQLErrors.length > 0) {
          this.serverError = err.graphQLErrors[0].message;
        } else {
          this.serverError = "Server Error";
        }
        this.httpWait = false;
        return err;
      }

      this.successCb();
    },
    async createTournamentTeams(tournamentId) {
      this.httpWait = true;
      for(let team of this.tournamentInputTeams) {
        const input = {
          price: parseFloat(team.price),
          teamId: team.id,
          seed: parseFloat(team.seed),
          region: team.region,
          tournamentId: tournamentId
        };
        try {
          await apolloClient.mutate({
            mutation: gql`
              mutation CreateTournamentTeam($input: TournamentTeamInput!) {
                createTournamentTeam(input: $input) {
                  id
                }
              }
            `,
            variables: {
              input
            }
          });

        } catch(err) {
          if(err.graphQLErrors && err.graphQLErrors.length > 0) {
            this.serverError = err.graphQLErrors[0].message;
          } else {
            this.serverError = "Server Error";
          }
          this.httpWait = false;
          return err;
        }
      }
    },
    async fetchTeamsForLeague() {
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
          leagueId: this.selectedLeague.id
        }
      });

      const leagueTeams = response.data.getTeamsByLeagueId;      
      this.tournamentInputTeams = leagueTeams.map((team) => {
        const price = 0;
        const seed = 1;

        return {
          ...team,
          price,
          seed
        }
      });
    },
    handlePricePaste(event, id) {
      const clipboardText = (event.clipboardData || window.clipboardData).getData('text');
      const lines = clipboardText.split(/\r\n|\r|\n/).map(line => line.trim()).filter(line => line !== "");

      // Single value: let the browser's normal paste-into-field behavior happen.
      if (lines.length <= 1) { return; }

      event.preventDefault();

      const startIndex = this.tournamentInputTeams.findIndex(team => team.id === id);
      if (startIndex === -1) { return; }

      lines.forEach((line, i) => {
        const targetTeam = this.tournamentInputTeams[startIndex + i];
        if (!targetTeam) { return; }

        // If a name+price column was pasted by mistake, take the last column as the price.
        const rawValue = line.split("\t").pop();
        const parsed = parseFloat(rawValue.replace(/[^0-9.-]/g, ""));
        if (!isNaN(parsed)) {
          targetTeam.price = parsed;
        }
      });
    },
    updateInput(id) {
      const priceInputValue = this.$refs['priceInput-' + id].value;
      const seedInputValue = this.$refs['seedInput-' + id].value;
      const regionInputValue = this.$refs['regionInput-' + id].value;
      const index = this.tournamentInputTeams.findIndex(team => team.id === id);
      this.tournamentInputTeams[index].price = priceInputValue;
      this.tournamentInputTeams[index].seed = seedInputValue;
      this.tournamentInputTeams[index].region = regionInputValue;
    }
  },
  async created() {
    this.selectedLeague = this.selectableLeagues.length > 0 ? this.selectableLeagues[0] : null;
  }
}
</script>

<style scoped>
.price-input {
  width: 50px;
}

.seed-input {
  width: 50px;
}
</style>