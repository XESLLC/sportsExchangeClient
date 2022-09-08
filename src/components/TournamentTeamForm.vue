<template>
  <div v-if="isPageReady">
    <div v-if="serverError" class="alert-error text-center">
      {{serverError}}
      <span @click="serverError = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
    </div>
    <md-table v-model="tournamentTeams" class="text-left">
      <md-table-row slot="md-table-row" slot-scope="{ item }">
        <md-table-cell md-label="Team" md-sort-by="name">{{ item.name }}</md-table-cell>
        <md-table-cell md-label="Price" md-sort-by="price">
          $<input :ref="'priceInput-' + item.id" @change="updateInput(item.id)" class="price-input" type="number" step="1" min="0" max="" :value="item.price">
        </md-table-cell>
        <md-table-cell v-if="league.defaultSettings.useSeed" md-label="Seed" md-sort-by="seed">
          <input :ref="'seedInput-' + item.id" @change="updateInput(item.id)" class="seed-input" type="number" step="1" min="1" max="" :value="item.seed">
        </md-table-cell>
        <md-table-cell v-if="league.defaultSettings.regions && league.defaultSettings.regions.length" md-label="Region">
          <select :ref="'regionInput-' + item.id" @change="updateInput(item.id)">
            <option :value="item.region" selected>{{item.region}}</option>
            <option v-for="region in league.defaultSettings.regions.filter(_region => _region !== item.region)" :key="region" :value="region">{{region}}</option>
          </select>
        </md-table-cell>
      </md-table-row>
    </md-table>

    <md-card-actions>
      <md-button :disabled="httpWait" @click="createOrUpdateTournamentTeams" class="md-raised md-primary" :class="{ 'btn-disabled' : httpWait }">
        Submit
        <md-progress-spinner v-if="httpWait" class="btn-spin" :md-diameter="20" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner>
      </md-button>
    </md-card-actions>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';

export default {
  name: "TournamentTeamForm",
  data() {
    return {
      isPageReady: false,
      leagueTeams: null,
      tournamentTeams: [],
      inputError: null,
      tournamentTeamData: null,
      serverError: null,
      league: null,
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
    leagueId: {
      type: String
    },
    tournamentId: {
      type: String
    }
  },
  methods: {
    async createOrUpdateTournamentTeams() {
      if(this.formType === 'edit') {
        this.httpWait = true;
        for(let team of this.tournamentTeams) {
          const input = {
            price: parseFloat(team.price),
            teamId: team.id,
            seed: parseFloat(team.seed),
            region: team.region,
            tournamentId: this.tournamentId
          };
          try {
            await apolloClient.mutate({
              mutation: gql`
                mutation UpdateTournamentTeam($input: TournamentTeamInput!) {
                  updateTournamentTeam(input: $input) {
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

        this.successCb();
      }
    },
    async fetchIpoData() {
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

      this.tournamentTeamData = response.data.tournamentTeams;
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
      this.tournamentTeams = this.leagueTeams.map((team) => {
        const price = 0;
        const seed = 1;
        const region = this.league.defaultSettings.regions && this.league.defaultSettings.regions.length ? this.league.defaultSettings.regions[0] : null;

        return {
          ...team,
          price,
          seed,
          region
        }
      }).map((_team) => {
        const foundTeam = this.tournamentTeamData.find(tournamentTeam => {
          return tournamentTeam.teamId === _team.id;
        });
        if(foundTeam) {
          _team.price = foundTeam.ipoPrice;
          _team.seed = foundTeam.seed;
          _team.region = foundTeam.region;
        }

        return {
          ..._team
        }
      });
    },
    async fetchLeague() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query League($id: ID!) {
            league(id: $id) {
              id
              name,
              defaultSettings {
                ipoBudget,
                secondaryMarketBudget,
                milestones {
                  name
                },
                regions,
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
    updateInput(id) {
      console.log("This Ref id=> ", this.$refs['priceInput-' + id].value)
      // const priceInputValue = this.$refs['priceInput-' + id].value;
      // const seedInputValue = this.$refs['seedInput-' + id].value;
      // const regionInputValue = this.$refs['seedInput-' + id].value;
      const index = this.tournamentTeams.findIndex(team => team.id === id);
      this.tournamentTeams[index].price = this.$refs['priceInput-' + id].value;
      this.tournamentTeams[index].seed = 0;
      this.tournamentTeams[index].region = '';
    }
  },
  async created() {
    await this.fetchLeague();
    await this.fetchIpoData();
    await this.fetchLeagueTeams();
    this.isPageReady = true;
  }
}
</script>

<style scoped>
</style>
