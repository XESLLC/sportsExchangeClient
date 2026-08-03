<template>
  <div v-if="isPageReady">
    <md-table v-model="tournamentTeamData" class="text-left">
      <md-table-row slot="md-table-row" slot-scope="{ item }">
        <md-table-cell md-label="Team" md-sort-by="name">{{ item.teamName }}</md-table-cell>
        <md-table-cell md-label="Dividend Price" md-sort-by="dividendPrice">
          $<input :ref="'dividendPriceInput-' + item.id" @change="updateInput(item.id)" class="dividend-price-input" type="number" step="1" min="0" max="" :value="item.milestoneInput.dividendPrice">
        </md-table-cell>
        <md-table-cell md-label="Wins" md-sort-by="wins">
          <input :ref="'winsInput-' + item.id" @change="updateInput(item.id)" class="wins-input" type="number" step="1" min="0" max="" :value="item.milestoneInput.wins">
        </md-table-cell>
        <md-table-cell md-label="Losses" md-sort-by="losses">
          <input :ref="'lossesInput-' + item.id" @change="updateInput(item.id)" class="losses-input" type="number" step="1" min="0" max="" :value="item.milestoneInput.losses">
        </md-table-cell>
        <md-table-cell md-label="Ties" md-sort-by="ties">
          <input :ref="'tiesInput-' + item.id" @change="updateInput(item.id)" class="ties-input" type="number" step="1" min="0" max="" :value="item.milestoneInput.ties">
        </md-table-cell>
      </md-table-row>
    </md-table>

    <md-card-actions>
      <md-button v-if="['1','2','3'].includes(milestone.id)" :disabled="tournamentClosed || standingsWait || httpWait" @click="autoFillFromStandings" class="md-accent md-raised" :class="{ 'btn-disabled' : tournamentClosed || standingsWait || httpWait }">
        Auto-fill from NFL Standings
        <md-progress-spinner v-if="standingsWait" class="btn-spin" :md-diameter="20" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner>
      </md-button>
      <md-button :disabled="tournamentClosed || httpWait" @click="saveMilestoneData" class="md-primary md-raised" :class="{ 'btn-disabled' : tournamentClosed || httpWait }">
        Save Milestone Data
        <md-progress-spinner v-if="httpWait" class="btn-spin" :md-diameter="20" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner>
      </md-button>
    </md-card-actions>
    <div v-if="tournamentClosed" class="tournament-closed-notice">
      This tournament is closed - milestone data is read-only.
    </div>
    <div v-if="standingsInfo" class="standings-info text-center">
      {{standingsInfo}}
    </div>
    <div v-if="serverError" class="alert-error text-center">
      {{serverError}}
      <span @click="serverError = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
    </div>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';

export default {
  name: "MilestoneForm",
  data() {
    return {
      isPageReady: false,
      leagueTeams: null,
      tournamentTeams: [],
      inputError: null,
      tournamentTeamData: null,
      serverError: null,
      httpWait: false,
      standingsWait: false,
      standingsInfo: null
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
    },
    milestone: {
      type: Object
    },
    tournamentClosed: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    async fetchTournamentTeams() {
      const response = await apolloClient.query({
      fetchPolicy: 'no-cache',
        query: gql`
          query TournamentTeams($tournamentId: ID!) {
            tournamentTeams(tournamentId: $tournamentId) {
              id,
              teamId,
              teamName,
              isEliminated,
              milestoneData {
                milestoneId,
                milestoneName,
                dividendPrice,
                wins,
                losses,
                ties
              }
            }
          }
        `,
        variables: {
          tournamentId: this.tournamentId
        }
      });

      const tournamentTeamData = response.data.tournamentTeams;

      if(this.milestone.id === '1') {
        if(!tournamentTeamData[0].milestoneData || !tournamentTeamData[0].milestoneData[0]) {
          this.tournamentTeamData = tournamentTeamData.map((tournamentTeam) => {
            return {
              id: tournamentTeam.id,
              teamId: tournamentTeam.teamId,
              teamName: tournamentTeam.teamName,
              milestoneInput: {
                milestoneId: this.milestone.id,
                milestoneName: this.milestone.name,
                dividendPrice: 0,
                wins: 0,
                losses: 0,
                ties: 0
              }
            }
          });
        } else {
          const index = parseInt(this.milestone.id) - 1;
          this.tournamentTeamData = tournamentTeamData.map((tournamentTeam) => {
            const milestoneInput = {
              milestoneId: tournamentTeam.milestoneData[index].milestoneId,
              milestoneName: tournamentTeam.milestoneData[index].milestoneName,
              dividendPrice: tournamentTeam.milestoneData[index].dividendPrice,
              wins: tournamentTeam.milestoneData[index].wins,
              losses: tournamentTeam.milestoneData[index].losses,
              ties: tournamentTeam.milestoneData[index].ties
            }
            return {
              ...tournamentTeam,
              milestoneInput
            }
          });
        }
      } else {
        const nonEliminatedTeams = tournamentTeamData.filter(teamData => !teamData.isEliminated)
        const index = parseInt(this.milestone.id) - 1;
        if(!nonEliminatedTeams[0].milestoneData || nonEliminatedTeams[0].milestoneData.length <= index) {
          this.tournamentTeamData = nonEliminatedTeams.map((tournamentTeam) => {
            return {
              id: tournamentTeam.id,
              teamId: tournamentTeam.teamId,
              teamName: tournamentTeam.teamName,
              milestoneInput: {
                milestoneId: this.milestone.id,
                milestoneName: this.milestone.name,
                dividendPrice: 0,
                wins: 0,
                losses: 0,
                ties: 0
              }
            }
          });
        } else {
          this.tournamentTeamData = nonEliminatedTeams.map((tournamentTeam) => {
            const milestoneInput = {
              milestoneId: tournamentTeam.milestoneData[index].milestoneId,
              milestoneName: tournamentTeam.milestoneData[index].milestoneName,
              dividendPrice: tournamentTeam.milestoneData[index].dividendPrice,
              wins: tournamentTeam.milestoneData[index].wins,
              losses: tournamentTeam.milestoneData[index].losses,
              ties: tournamentTeam.milestoneData[index].ties
            }
            return {
              ...tournamentTeam,
              milestoneInput
            }
          });
        }
      }
    },
    async autoFillFromStandings() {
      this.standingsWait = true;
      this.standingsInfo = null;
      this.serverError = null;
      try {
        if (this.milestone.id === '1') {
          await this.autoFillRegularSeason();
        } else {
          await this.autoFillFlatBonusMilestone();
        }
      } catch(err) {
        if(err.graphQLErrors && err.graphQLErrors.length > 0) {
          this.serverError = err.graphQLErrors[0].message;
        } else {
          this.serverError = "Failed to fetch NFL standings";
        }
      }
      this.standingsWait = false;
    },
    async autoFillRegularSeason() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query PreviewRegularSeasonDividends($tournamentId: ID!) {
            previewRegularSeasonDividends(tournamentId: $tournamentId) {
              totalPoolInvested
              totalLeagueWins
              perWinRate
              unmatchedTeamNames
              teams {
                tournamentTeamId
                matched
                wins
                losses
                ties
                dividendPrice
              }
            }
          }
        `,
        variables: {
          tournamentId: this.tournamentId
        }
      });

      const preview = response.data.previewRegularSeasonDividends;
      const previewByTournamentTeamId = new Map(
        preview.teams.map(team => [team.tournamentTeamId, team])
      );

      // Populate the existing input fields so the admin can review/edit
      // before hitting Save - nothing is written to the DB by this step.
      this.tournamentTeamData = this.tournamentTeamData.map((team) => {
        const teamPreview = previewByTournamentTeamId.get(team.id);
        if (!teamPreview) { return team; }

        return {
          ...team,
          milestoneInput: {
            ...team.milestoneInput,
            wins: teamPreview.wins,
            losses: teamPreview.losses,
            ties: teamPreview.ties,
            dividendPrice: teamPreview.dividendPrice
          }
        };
      });

      let info = `Pulled live NFL standings. Pool: $${preview.totalPoolInvested.toFixed(2)}, ` +
        `${preview.totalLeagueWins} total league wins, $${preview.perWinRate.toFixed(2)}/win. ` +
        `Review below, then click Save.`;
      if (preview.unmatchedTeamNames.length > 0) {
        info += ` Could not match: ${preview.unmatchedTeamNames.join(', ')} - left unchanged, please fill in manually.`;
      }
      this.standingsInfo = info;
    },
    async autoFillFlatBonusMilestone() {
      // Milestone 2 = Division Title, Milestone 3 = Conf #1 Seed.
      // Same shape of response for both, just a different query/detection rule server-side.
      const queryName = this.milestone.id === '2' ? 'previewDivisionTitleDividends' : 'previewConfSeed1Dividends';

      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query PreviewFlatBonus($tournamentId: ID!) {
            ${queryName}(tournamentId: $tournamentId) {
              totalPoolInvested
              poolPercent
              flatBonus
              unmatchedTeamNames
              teams {
                tournamentTeamId
                matched
                achieved
                dividendPrice
              }
            }
          }
        `,
        variables: {
          tournamentId: this.tournamentId
        }
      });

      const preview = response.data[queryName];
      const previewByTournamentTeamId = new Map(
        preview.teams.map(team => [team.tournamentTeamId, team])
      );

      // Only dividendPrice is meaningful here (wins/losses/ties aren't part
      // of this milestone) - review below, then Save same as always.
      this.tournamentTeamData = this.tournamentTeamData.map((team) => {
        const teamPreview = previewByTournamentTeamId.get(team.id);
        if (!teamPreview) { return team; }

        return {
          ...team,
          milestoneInput: {
            ...team.milestoneInput,
            dividendPrice: teamPreview.dividendPrice
          }
        };
      });

      const achievedTeamNames = this.tournamentTeamData
        .filter(team => {
          const teamPreview = previewByTournamentTeamId.get(team.id);
          return teamPreview && teamPreview.achieved;
        })
        .map(team => team.teamName);

      let info = `Pulled live NFL standings. Pool: $${preview.totalPoolInvested.toFixed(2)}, ` +
        `${(preview.poolPercent * 100).toFixed(1)}% of pot = $${preview.flatBonus.toFixed(2)} per team that hit this milestone. ` +
        (achievedTeamNames.length > 0
          ? `Currently: ${achievedTeamNames.join(', ')}. `
          : `No team currently qualifies (may be too early in the season). `) +
        `Review below, then click Save.`;
      if (preview.unmatchedTeamNames.length > 0) {
        info += ` Could not match: ${preview.unmatchedTeamNames.join(', ')} - left unchanged, please fill in manually.`;
      }
      this.standingsInfo = info;
    },
    async saveMilestoneData() {
      this.httpWait = true;
      const savePromises = this.tournamentTeamData.map((team) => {
        const parsedMilestoneInput = {
          milestoneId: team.milestoneInput.milestoneId,
          milestoneName: team.milestoneInput.milestoneName,
          dividendPrice: parseFloat(team.milestoneInput.dividendPrice),
          wins: parseInt(team.milestoneInput.wins),
          losses: parseInt(team.milestoneInput.losses),
          ties: parseInt(team.milestoneInput.ties)
        }
        const input = {
          id: team.id,
          milestoneInput: parsedMilestoneInput
        }
        return apolloClient.mutate({
          fetchPolicy: 'no-cache',
          mutation: gql`
            mutation createOrUpdateMilestoneData($input: TournamentTeamMilestoneInput!) {
              createOrUpdateMilestoneData(input: $input) {
                id,
                name
              }
            }
          `,
          variables: {
            input
          }
        });
      });

      try {
        // Fired concurrently instead of one-at-a-time - same 32 mutations,
        // but they no longer wait on each other's network round-trip.
        await Promise.all(savePromises);
      } catch(err) {
        if(err.graphQLErrors && err.graphQLErrors.length > 0) {
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
    updateInput(id) {
      const dividendInputValue = this.$refs['dividendPriceInput-' + id].value;
      const winsInputValue = this.$refs['winsInput-' + id].value;
      const lossesInputValue = this.$refs['lossesInput-' + id].value;
      const tiesInputValue = this.$refs['tiesInput-' + id].value;
      const index = this.tournamentTeamData.findIndex(team => team.id === id);
      this.tournamentTeamData[index].milestoneInput.dividendPrice = dividendInputValue;
      this.tournamentTeamData[index].milestoneInput.wins = winsInputValue;
      this.tournamentTeamData[index].milestoneInput.losses = lossesInputValue;
      this.tournamentTeamData[index].milestoneInput.ties = tiesInputValue;
    }
  },
  async created() {
    // await this.fetchIpoData();
    // await this.fetchLeagueTeams();
    await this.fetchTournamentTeams();
    this.isPageReady = true;
  }
}
</script>

<style scoped>
  .dividend-price-input {
    width: 60px;
  }

  .wins-input {
    width: 60px;
  }

  .standings-info {
    margin-top: 8px;
    font-size: 0.9em;
    color: #555;
  }

  .tournament-closed-notice {
    margin-top: 8px;
    padding: 8px;
    background-color: #fff3cd;
    color: #664d03;
    border-radius: 4px;
    font-size: 0.9em;
  }
</style>