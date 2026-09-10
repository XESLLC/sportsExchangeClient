<template>
  <div v-if="isPageReady">
    <div class="milestone-summary">
      <span v-if="milestone.id === '1'">
        {{ perSlotPayout | toCurrency }} per win &middot; {{ slotCount }} win slots &middot; {{ poolPercentLabel }} of pot
      </span>
      <span v-else>
        {{ perSlotPayout | toCurrency }} per qualifying team &middot; {{ slotCount }} slots &middot; {{ poolPercentLabel }} of pot
      </span>
    </div>
    <div v-if="warnNotFinal" class="milestone-warn">
      Only {{ enteredCount }} of {{ slotCount }} {{ milestone.id === '1' ? 'wins' : 'teams' }} entered.
      Saving now writes this milestone's dividends into the live rankings and distributes its full pool across a partial season - save only when the results are final.
    </div>

    <md-table v-model="tournamentTeamData" class="text-left">
      <md-table-row slot="md-table-row" slot-scope="{ item }">
        <md-table-cell md-label="Team" md-sort-by="name">{{ item.teamName }}</md-table-cell>
        <template v-if="milestone.id === '1'">
          <md-table-cell md-label="Wins" md-sort-by="wins">
            <input :ref="'winsInput-' + item.id" @change="updateInput(item.id)" class="wins-input" type="number" step="1" min="0" :value="item.milestoneInput.wins">
          </md-table-cell>
          <md-table-cell md-label="Losses" md-sort-by="losses">
            <input :ref="'lossesInput-' + item.id" @change="updateInput(item.id)" class="losses-input" type="number" step="1" min="0" :value="item.milestoneInput.losses">
          </md-table-cell>
          <md-table-cell md-label="Ties" md-sort-by="ties">
            <input :ref="'tiesInput-' + item.id" @change="updateInput(item.id)" class="ties-input" type="number" step="1" min="0" :value="item.milestoneInput.ties">
          </md-table-cell>
        </template>
        <md-table-cell v-else md-label="Achieved">
          <input type="checkbox" :ref="'achievedInput-' + item.id" @change="toggleAchieved(item.id)" :checked="item.milestoneInput.achieved">
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

// Full-season qualifying slots per milestone - mirrors the server defaults
// in TournamentService. Only used to fall back before an explicit
// slotCount is saved for the tournament.
const DEFAULT_MILESTONE_SLOT_COUNTS = {
  '1': 272, '2': 8, '3': 2, '4': 8, '5': 4, '6': 2, '7': 1
};

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
    totalPot: {
      type: Number,
      default: 0
    },
    tournamentClosed: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    slotCount() {
      if (this.milestone && typeof this.milestone.slotCount === 'number' && this.milestone.slotCount > 0) {
        return this.milestone.slotCount;
      }
      return DEFAULT_MILESTONE_SLOT_COUNTS[this.milestone && this.milestone.id] || 1;
    },
    perSlotPayout() {
      const pct = this.milestone && typeof this.milestone.poolPercent === 'number' ? this.milestone.poolPercent : 0;
      if (this.slotCount <= 0) return 0;
      return pct * (this.totalPot || 0) / this.slotCount;
    },
    poolPercentLabel() {
      const pct = this.milestone && typeof this.milestone.poolPercent === 'number' ? this.milestone.poolPercent : 0;
      return `${Math.round(pct * 1000) / 10}%`;
    },
    enteredCount() {
      if (!this.tournamentTeamData) return 0;
      if (this.milestone.id === '1') {
        return this.tournamentTeamData.reduce((sum, t) => sum + (parseInt(t.milestoneInput.wins, 10) || 0), 0);
      }
      return this.tournamentTeamData.filter(t => t.milestoneInput && t.milestoneInput.achieved).length;
    },
    warnNotFinal() {
      return this.enteredCount < this.slotCount;
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
                ties,
                achieved
              }
            }
          }
        `,
        variables: {
          tournamentId: this.tournamentId
        }
      });

      const index = parseInt(this.milestone.id, 10) - 1;
      const isRegSeason = this.milestone.id === '1';
      const teams = isRegSeason
        ? response.data.tournamentTeams
        : response.data.tournamentTeams.filter(t => !t.isEliminated);

      this.tournamentTeamData = teams.map((tournamentTeam) => {
        const saved = tournamentTeam.milestoneData && tournamentTeam.milestoneData[index]
          ? tournamentTeam.milestoneData[index]
          : null;
        return {
          id: tournamentTeam.id,
          teamId: tournamentTeam.teamId,
          teamName: tournamentTeam.teamName,
          milestoneInput: {
            milestoneId: this.milestone.id,
            milestoneName: this.milestone.name,
            wins: saved ? (saved.wins || 0) : 0,
            losses: saved ? (saved.losses || 0) : 0,
            ties: saved ? (saved.ties || 0) : 0,
            achieved: saved ? !!saved.achieved : false
          }
        };
      });
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
              slotCount
              tieGames
              perWinRate
              unmatchedTeamNames
              teams {
                tournamentTeamId
                matched
                wins
                losses
                ties
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
            ties: teamPreview.ties
          }
        };
      });

      let info = `Pulled live NFL standings. Pool: $${preview.totalPoolInvested.toFixed(2)}, ` +
        `${preview.totalLeagueWins} wins played so far of ${preview.slotCount} season slots, ` +
        `$${preview.perWinRate.toFixed(2)}/win. Review below, then click Save.`;
      if (preview.tieGames > 0) {
        info += ` Standings show ${preview.tieGames} tied game(s) - consider setting Slots to ${preview.slotCount - preview.tieGames}.`;
      }
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
              slotCount
              flatBonus
              unmatchedTeamNames
              teams {
                tournamentTeamId
                matched
                achieved
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

      // Tick the "achieved" box for each team the standings say currently
      // qualifies - review below, then Save writes the derived dividends.
      this.tournamentTeamData = this.tournamentTeamData.map((team) => {
        const teamPreview = previewByTournamentTeamId.get(team.id);
        if (!teamPreview) { return team; }

        return {
          ...team,
          milestoneInput: {
            ...team.milestoneInput,
            achieved: !!teamPreview.achieved
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
        `${(preview.poolPercent * 100).toFixed(1)}% of pot across ${preview.slotCount} slots = ` +
        `$${preview.flatBonus.toFixed(2)} per qualifying team. ` +
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

      const teams = this.tournamentTeamData.map((team) => ({
        tournamentTeamId: team.id,
        wins: parseInt(team.milestoneInput.wins, 10) || 0,
        losses: parseInt(team.milestoneInput.losses, 10) || 0,
        ties: parseInt(team.milestoneInput.ties, 10) || 0,
        achieved: !!team.milestoneInput.achieved
      }));

      try {
        await apolloClient.mutate({
          fetchPolicy: 'no-cache',
          mutation: gql`
            mutation saveMilestoneResults($input: MilestoneResultsInput!) {
              saveMilestoneResults(input: $input) {
                id
              }
            }
          `,
          variables: {
            input: {
              tournamentId: this.tournamentId,
              milestoneId: String(this.milestone.id),
              milestoneName: this.milestone.name,
              teams
            }
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
      this.httpWait = false;
      this.successCb();
    },
    updateInput(id) {
      const index = this.tournamentTeamData.findIndex(team => team.id === id);
      if (index === -1) return;
      const winsRef = this.$refs['winsInput-' + id];
      const lossesRef = this.$refs['lossesInput-' + id];
      const tiesRef = this.$refs['tiesInput-' + id];
      if (winsRef) this.tournamentTeamData[index].milestoneInput.wins = winsRef.value;
      if (lossesRef) this.tournamentTeamData[index].milestoneInput.losses = lossesRef.value;
      if (tiesRef) this.tournamentTeamData[index].milestoneInput.ties = tiesRef.value;
    },
    toggleAchieved(id) {
      const index = this.tournamentTeamData.findIndex(team => team.id === id);
      if (index === -1) return;
      const ref = this.$refs['achievedInput-' + id];
      this.tournamentTeamData[index].milestoneInput.achieved = ref ? ref.checked : false;
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
  .wins-input,
  .losses-input,
  .ties-input {
    width: 60px;
  }

  .milestone-summary {
    margin-bottom: 8px;
    font-weight: bold;
  }

  .milestone-warn {
    margin-bottom: 12px;
    padding: 8px;
    background-color: #fff3cd;
    color: #664d03;
    border-radius: 4px;
    font-size: 0.9em;
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