<template>
  <div v-if="isPageReady" class="content-container">
    <div class="back-btn-container text-left">
      <div class="btn-wrapper" @click="currentSelectedView = 'main'">
        <md-icon class="fa fa-angle-left link"></md-icon>
        <span class="link">Back</span>
      </div>
    </div>

    <md-card>
      <div v-if="successMessage" class="alert-success">
        {{successMessage}}
        <span @click="successMessage = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
      </div>
      <div v-if="serverError" class="alert-error">
        {{serverError}}
        <span @click="serverError = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
      </div>
      <md-card-header>
        <div class="md-title">{{tournament.name}}</div>
      </md-card-header>

      <md-card-content>
        <div class="card-padding">
          <div class="text-left">
            <h4>Tournament Settings</h4>
            <div>IPO Budget: {{tournament.settings.ipoBudget | toCurrency}}</div>
            <div>Secondary Market Budget:
              <span v-if="tournament.settings.secondaryMarketBudget">{{tournament.settings.secondaryMarketBudget | toCurrency}}</span>
              <span v-else>Unlimited</span>
            </div>
            <md-switch v-model="isIpoOpenInput" @change="toggleIpoIsActive()" class="md-primary">
              <div>IPO Open: {{isIpoOpenInput}}</div>
            </md-switch>
            <div class="tournament-status-control">
              <label for="tournament-status-select">Tournament Status:</label>
              <select id="tournament-status-select" v-model="tournamentStatusInput" @change="updateTournamentStatus()">
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div v-if="tournamentStatusInput === 'closed'" class="tournament-closed-notice">
              This tournament is closed - new entries, trading, and milestone/dividend edits are disabled. History remains visible to participants.
            </div>
            <div v-if="tournamentStatusInput === 'inactive'" class="tournament-closed-notice">
              This tournament is inactive - it's hidden from non-admins entirely, including their own past entries.
            </div>
            <div>
              <span class="link decorated-link" @click="showEditTournamentTeamsModal = true">Edit Tournament Teams IPO</span>
            </div>
            <div>
              <span class="link decorated-link" @click="showSetupTournamentTeamsModal = true">Add/Set Up Teams</span>
            </div>
            <div>
              <span class="link decorated-link" @click="showMarkEliminatedTeamsModal = true">Mark Eliminated Teams</span>
            </div>
          </div>
        </div>
        <div class="entry-table">
          <md-table md-card v-model="entries" class="text-left">
            <md-table-toolbar>
              <h3 class="md-title">Entries</h3>
              <md-button @click="initializeShowMasterSheet()" class="md-primary">View Master Sheet Data</md-button>
            </md-table-toolbar>

            <md-table-row slot="md-table-row" slot-scope="{ item, index }">
              <md-table-cell md-label="Entry Name" md-sort-by="name">{{ item.name }}</md-table-cell>
              <md-table-cell md-label="Owner(s)">{{entryOwners[item.id].fullname}}</md-table-cell>
              <md-table-cell md-label="Email(s)">{{entryOwners[item.id].email}}</md-table-cell>
              <md-table-cell md-label="Profit/Loss">{{(dividendTotals[index] - (item.ipoCashSpent + item.secondaryMarketCashSpent)) | toCurrency}}</md-table-cell>
              <md-table-cell md-label="Edit Entry Data">
                <span @click="currentSelectedView = 'editEntry', currentSelectedEntry = item"><md-icon class="fas fa-edit link"></md-icon></span>
              </md-table-cell>
            </md-table-row>
          </md-table>
        </div>
        <div class="email-blast-section">
          <md-button @click="showEmailForm = !showEmailForm" class="md-accent md-raised">
            {{ showEmailForm ? 'Hide Email Form' : 'Email Participants' }}
          </md-button>
          <email-blast-form
            v-if="showEmailForm"
            :tournament-id="tournamentId"
            :recipient-count="entries ? entries.length : 0"
          ></email-blast-form>
        </div>
        <div>
          <md-table class="text-left" md-card v-model="tournament.settings.milestones">
            <md-table-toolbar>
              <h1 class="md-title">Milestone Data</h1>
            </md-table-toolbar>
            <md-table-row slot="md-table-row" slot-scope="{ item }">
              <md-table-cell md-label="Name" md-sort-by="name">{{ item.name }}</md-table-cell>
              <md-table-cell md-label="% of Pot">
                <input
                  :value="milestonePercentInputs[item.id]"
                  @input="milestonePercentInputs[item.id] = $event.target.value"
                  :disabled="tournament.status === 'closed'"
                  class="pool-percent-input"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                >%
                <span v-if="tournament.status !== 'closed'" @click="saveMilestonePoolPercent(item)" title="Save % of pot">
                  <md-icon class="fas fa-save link"></md-icon>
                </span>
                <span v-if="savingMilestonePercent[item.id]" class="pool-percent-saved">Saved</span>
              </md-table-cell>
              <md-table-cell md-label="Edit/Enter Data">
                <span @click="editMilestone(item)"><md-icon class="fas fa-edit link"></md-icon></span>
              </md-table-cell>
            </md-table-row>
          </md-table>
        </div>
      </md-card-content>

      <!-- <md-card-actions>
        <md-button class="md-primary" @click="showEditTournamentTeamsModal = true">Edit Tournament Teams</md-button>
      </md-card-actions> -->
    </md-card>

    <md-dialog :md-active.sync="showEditTournamentTeamsModal" :md-fullscreen="false">
      <md-dialog-title>Edit Tournament Teams</md-dialog-title>
      <md-dialog-content>
        <tournament-team-form :form-type="'edit'" :success-cb="editTournamentTeamsSuccessCb" :league-id="leagueId" :tournament-id="tournamentId"></tournament-team-form>
      </md-dialog-content>
    </md-dialog>

    <md-dialog :md-active.sync="showSetupTournamentTeamsModal" :md-fullscreen="true">
      <md-dialog-title>Add/Set Up Teams - {{tournament.name}}</md-dialog-title>
      <md-dialog-content>
        <tournament-team-setup-form :success-cb="setupTournamentTeamsSuccessCb" :league-id="leagueId" :tournament-id="tournamentId"></tournament-team-setup-form>
      </md-dialog-content>
    </md-dialog>

    <md-dialog :md-active.sync="showEditMilestoneModal" :md-fullscreen="false">
      <md-dialog-title v-if="selectedMilestone">Milestone - {{selectedMilestone.name}}</md-dialog-title>
      <md-dialog-content>
        <milestone-form :form-type="'edit'" :success-cb="editMilestoneCb" :milestone="selectedMilestone" :tournament-id="tournamentId" :league-id="leagueId" :tournament-closed="tournament.status === 'closed'"></milestone-form>
      </md-dialog-content>
    </md-dialog>

    <md-dialog :md-active.sync="showMarkEliminatedTeamsModal" :md-fullscreen="false">
      <md-dialog-title>Mark Teams as Eliminated</md-dialog-title>
      <md-dialog-content>
        <eliminate-teams-form :success-cb="markEliminatedCb" :tournament-id="tournamentId" :league-id="leagueId"></eliminate-teams-form>
      </md-dialog-content>
    </md-dialog>

    <md-dialog :md-active.sync="showMasterSheetModal" :md-fullscreen="false" id="master-sheet">
      <md-dialog-title>
        Master Sheet Data - {{tournament.name}}
      </md-dialog-title>
      <md-dialog-content class="master-sheet-content">
        <master-sheet :tournament-id="tournamentId" :master-sheet-entry-stock-data="masterSheetEntryStockData" :master-sheet-transaction-data="masterSheetTransactionData"></master-sheet>
      </md-dialog-content>
    </md-dialog>
  </div>
  <div v-else>
    <md-progress-spinner class="spinner-primary" md-mode="indeterminate"></md-progress-spinner>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';
import TournamentTeamForm from './TournamentTeamForm.vue';
import TournamentTeamSetupForm from './TournamentTeamSetupForm.vue';
import MilestoneForm from './MilestoneForm.vue';
import EliminateTeamsForm from './EliminateTeamsForm.vue';
import MasterSheet from './MasterSheet.vue';
import EmailBlastForm from './EmailBlastForm.vue';

function round1(value) {
  return Math.round(value * 10) / 10;
}

export default {
  components: { TournamentTeamForm, TournamentTeamSetupForm, MilestoneForm, EliminateTeamsForm, MasterSheet, EmailBlastForm },
  name: "Tournament",
  data() {
    return {
      isPageReady: false,
      showEditTournamentTeamsModal: false,
      showSetupTournamentTeamsModal: false,
      showEditMilestoneModal: false,
      tournament: null,
      entries: null,
      successMessage: null,
      serverError: null,
      userTournamentEntry: null,
      milestonePercentInputs: {},
      savingMilestonePercent: {},
      attrs: {
        currentSelectedView: this.selectedView,
        currentSelectedEntry: this.selectedEntry
      },
      entryOwners: {},
      selectedMilestone: null,
      isIpoOpenInput: null,
      showMarkEliminatedTeamsModal: false,
      dividendTotals: {},
      tournamentStatusInput: null,
      selectedFile: null,
      entryStocks: null,
      masterSheetEntryStockData: null,
      showMasterSheetModal: false,
      transactions: null,
      masterSheetTransactionData: null,
      showEmailForm: false
    }
  },
  computed: {
    currentSelectedView: {
      get() {
        return this.attrs.currentSelectedView;
      },
      set(value) {
        this.attrs.currentSelectedView = value;
        this.$emit(`update:selected-view`, value);
      }
    },
    currentSelectedEntry: {
      get() {
        return this.attrs.currentSelectedEntry;
      },
      set(value) {
        this.attrs.currentSelectedEntry = value;
        this.$emit(`update:selected-entry`, value);
      }
    }
  },
  props: {
    tournamentId: {
      type: String
    },
    leagueId: {
      type: String
    },
    selectedView: {
      type: String
    },
    selectedEntry: {
      type: Object
    }
  },
  methods: {
    async initializeShowMasterSheet() {
      const tournamentTeamData = await this.fetchAllTournamentTeamData();
      let stocks = [...this.entryStocks];
      stocks = stocks.map((stock) => {
        const purchasedStockTeamIds = stock.map(_stock => _stock.teamId);
        const nonPurchasedTeamData = tournamentTeamData.filter((data) => {
          if(!purchasedStockTeamIds.includes(data.teamId)) {
            return data;
          }
        });
        for(let data of nonPurchasedTeamData) {
          stock.push({
            teamName: data.teamName,
            ipoPrice: data.ipoPrice,
            quantity: 0,
            teamId: data.teamId
          })
        }
        return [...stock];
      });

      this.masterSheetEntryStockData = this.entries.map((entry, index) => {
        const _stocks = stocks[index];
        const dividendPayout = this.dividendTotals[index];
        return {
          ...entry,
          ownerName: this.entryOwners[entry.id].fullname,
          ownerEmail: this.entryOwners[entry.id].email,
          dividendPayout,
          stocks: _stocks
        }
      });

      this.masterSheetTransactionData = this.entries.map((entry) => {
        const entryTransactions = this.transactions.filter(transaction => transaction.entry.id === entry.id);
        return {
          ...entry,
          ownerName: this.entryOwners[entry.id].fullname,
          ownerEmail: this.entryOwners[entry.id].email,
          entryTransactions
        }
      });

      this.showMasterSheetModal = true;
    },
    async toggleIpoIsActive() {
      const response = await apolloClient.mutate({
        fetchPolicy: 'no-cache',
        mutation: gql`
          mutation ToggleIsIpoOpen($tournamentId: ID!, $isIpoOpen: Boolean!) {
            toggleIsIpoOpen(tournamentId: $tournamentId, isIpoOpen: $isIpoOpen) {
              id
              name,
              isIpoOpen
            }
          }
        `,
        variables: {
          tournamentId: this.tournamentId,
          isIpoOpen: this.isIpoOpenInput
        }
      });

      this.isIpoOpenInput = response.data.toggleIsIpoOpen.isIpoOpen;
      this.successMessage = `Successfully changed IPO open to ${this.isIpoOpenInput}`;
    },
    async fetchTransactions() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query GetTournamentTransactions($tournamentId: ID!) {
            getTournamentTransactions(tournamentId: $tournamentId) {
              id,
              entry { id, name },
              teamName,
              tournamentTeamId,
              quantity,
              cost,
              createdAt
            }
          }
        `,
        variables: {
          tournamentId: this.tournamentId
        }
      });

      this.transactions = response.data.getTournamentTransactions;
    },
    async updateTournamentStatus() {
      const response = await apolloClient.mutate({
        fetchPolicy: 'no-cache',
        mutation: gql`
          mutation UpdateTournamentStatus($tournamentId: ID!, $status: TournamentStatus!) {
            updateTournamentStatus(tournamentId: $tournamentId, status: $status) {
              id
              name,
              status,
              masterSheetUpload,
              pricingSheetUpload,
              rulesSheetUpload,
              projectedPayoutSheetUpload,
              stockPayoutSheetUpload
            }
          }
        `,
        variables: {
          tournamentId: this.tournamentId,
          status: this.tournamentStatusInput
        }
      });

      this.tournamentStatusInput = response.data.updateTournamentStatus.status;
      this.tournament.status = this.tournamentStatusInput;
      this.successMessage = `Successfully changed tournament status to ${this.tournamentStatusInput}`;
    },
    async getStocks() {
      let result = [];
      for(let entry of this.entries) {
        const response = await apolloClient.query({
          fetchPolicy: 'no-cache',
          query: gql`
            query StocksByEntryId($entryId: ID!) {
              stocksByEntryId(entryId: $entryId) {
                teamName,
                ipoPrice,
                quantity,
                teamId,
                tournamentTeamId
              }
            }
          `,
          variables: {
            entryId: entry.id
          }
        });

        result.push(response.data.stocksByEntryId);
      }

      return result;
    },
    editMilestone(milestone) {
      this.selectedMilestone = milestone;
      this.showEditMilestoneModal = true;
    },
    async saveMilestonePoolPercent(milestone) {
      const rawValue = parseFloat(this.milestonePercentInputs[milestone.id]);
      if (isNaN(rawValue) || rawValue < 0 || rawValue > 100) {
        this.serverError = "% of pot must be a number between 0 and 100";
        return;
      }
      const poolPercent = rawValue / 100;

      try {
        await apolloClient.mutate({
          fetchPolicy: 'no-cache',
          mutation: gql`
            mutation updateMilestonePoolPercent($tournamentId: ID!, $milestoneId: String!, $poolPercent: Float!) {
              updateMilestonePoolPercent(tournamentId: $tournamentId, milestoneId: $milestoneId, poolPercent: $poolPercent) {
                id
              }
            }
          `,
          variables: {
            tournamentId: this.tournamentId,
            milestoneId: String(milestone.id),
            poolPercent
          }
        });

        milestone.poolPercent = poolPercent;
        this.savingMilestonePercent = { ...this.savingMilestonePercent, [milestone.id]: true };
        setTimeout(() => {
          this.savingMilestonePercent = { ...this.savingMilestonePercent, [milestone.id]: false };
        }, 2000);
      } catch(err) {
        if(err.graphQLErrors && err.graphQLErrors.length > 0) {
          this.serverError = err.graphQLErrors[0].message;
        } else {
          this.serverError = "Failed to save % of pot";
        }
      }
    },
    async fetchTournamentTeams(entryStocks) {
      return await Promise.all(
        entryStocks.map(async (stock) => {
          const teamId = stock.teamId;
          try {
            const response = await apolloClient.query({
            fetchPolicy: 'no-cache',
              query: gql`
                query TournamentTeamByTeamId($tournamentId: ID!, $teamId: ID!) {
                  tournamentTeamByTeamId(tournamentId: $tournamentId, teamId: $teamId) {
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
                    },
                    numStocksInCirculation
                  }
                }
              `,
              variables: {
                tournamentId: this.tournamentId,
                teamId
              }
            });

            const tournamentTeamData = response.data.tournamentTeamByTeamId;
            return tournamentTeamData;
          } catch(err) {
            if(err.graphQLErrors && err.graphQLErrors.length > 0) {
              this.errorMessage = err.graphQLErrors[0].message;
            } else {
              this.errorMessage = "Server Error";
            }
            return err;
          }
        })
      );
    },
    async getDividendTotals() {
      this.entryStocks = await this.getStocks();
      for(let i = 0; i < this.entryStocks.length; i++) {
        const tournamentTeamData = await this.fetchTournamentTeams(this.entryStocks[i]);
        const milestoneTeamData = tournamentTeamData.filter(teamData => teamData.milestoneData);
        if(milestoneTeamData.length === 0) {
          this.dividendTotals[i] = 0;
        } else {
          const milestoneList = milestoneTeamData.map((team) => {
            const dataList = team.milestoneData.reduce((_result, _data) => {
              const dividendPrice = this.truncateDecimals(_data.dividendPrice / team.numStocksInCirculation, 2);
              const tournamentTeamId = team.id;
              if(!_result[tournamentTeamId]) {
                _result[tournamentTeamId] = dividendPrice;
              } else {
                _result[tournamentTeamId] += dividendPrice;
              }
              return _result;
            }, {});

            return dataList;
          });

          const total = milestoneList.reduce((result, _data) => {
            const found = this.entryStocks[i].find(entryStock => entryStock.tournamentTeamId === Object.keys(_data)[0]);
            if(found) {
              const multiplier = found.quantity;
              result += (Object.values(_data)[0] * multiplier);
            }
            return result;
          }, 0);

          this.dividendTotals[i] = total;
        }
      }
    },
    truncateDecimals(number, digits) {
      const multiplier = Math.pow(10, digits);
      const adjustedNum = number * multiplier;
      const truncatedNum = Math[adjustedNum < 0 ? 'ceil' : 'floor'](adjustedNum);

      return truncatedNum / multiplier;
    },
    async fetchAllTournamentTeamData() {
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
              numStocksInCirculation
            }
          }
        `,
        variables: {
          tournamentId: this.tournamentId
        }
      });

      return response.data.tournamentTeams;
    },
    async fetchEntryUsers() {
      for(let entry of this.entries) {
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
            entryId: entry.id
          }
        });

        const userResponse = response.data.usersByEntryId;
        this.entryOwners[entry.id] = userResponse.reduce((result, user) => {
          if(!this.entryOwners[entry.id]) {
            result = {
              fullname: `${user.firstname} ${user.lastname}`,
              email: user.email
            }
          } else {
            result.fullname += `, ${user.firstname} ${user.lastname}`;
            result.email += `, ${user.email}`;
          }
          return result;
        }, {});
      }
    },
    async fetchTournamentEntries() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query EntriesByTournamentId($tournamentId: ID!) {
            entriesByTournamentId(tournamentId: $tournamentId) {
              id,
              name,
              tournamentId,
              ipoCashSpent,
              secondaryMarketCashSpent,
              secondaryMarketCashIncome
            }
          }
        `,
        variables: {
          tournamentId: this.tournamentId
        }
      });

      this.entries = response.data.entriesByTournamentId;
    },
    async editTournamentTeamsSuccessCb() {
      this.showEditTournamentTeamsModal = false;
      await this.fetchTournamentEntries();
      await this.fetchEntryUsers();
      await this.getDividendTotals();
      this.successMessage = "Successfully editted teams for tournament!";
    },
    async setupTournamentTeamsSuccessCb() {
      this.showSetupTournamentTeamsModal = false;
      await this.fetchTournamentEntries();
      await this.fetchEntryUsers();
      await this.getDividendTotals();
      this.successMessage = "Successfully saved tournament teams!";
    },
    async editMilestoneCb() {
      this.showEditMilestoneModal = false;
      await this.fetchTournamentEntries();
      await this.fetchEntryUsers();
      await this.getDividendTotals();
      this.successMessage = `Successfully entered milestone data for ${this.selectedMilestone.name}!`;
    },
    async markEliminatedCb() {
      this.showMarkEliminatedTeamsModal = false;
      await this.fetchTournamentEntries();
      await this.fetchEntryUsers();
      await this.getDividendTotals();
      this.successMessage = "Successfully elimiated teams for tournament!";
    }
  },
  async created() {
    const response = await apolloClient.query({
      fetchPolicy: 'no-cache',
      query: gql`
        query Tournament($id: ID!) {
          tournament(id: $id) {
            id
            name,
            isIpoOpen,
            status,
            masterSheetUpload,
            pricingSheetUpload,
            rulesSheetUpload,
            projectedPayoutSheetUpload,
            stockPayoutSheetUpload
            settings {
              ipoBudget,
              secondaryMarketBudget,
              milestones {
                id,
                name,
                poolPercent
              }
            }
          }
        }
      `,
      variables: {
        id: this.tournamentId
      }
    });

    this.tournament = response.data.tournament;
    this.isIpoOpenInput = this.tournament.isIpoOpen;
    this.tournamentStatusInput = this.tournament.status;
    (this.tournament.settings.milestones || []).forEach((milestone) => {
      this.milestonePercentInputs[milestone.id] = milestone.poolPercent != null
        ? round1(milestone.poolPercent * 100)
        : 0;
    });

    await this.fetchTournamentEntries();
    await this.fetchEntryUsers();
    await this.getDividendTotals();
    await this.fetchTransactions();
    this.isPageReady = true;
  }
}
</script>

<style scoped>
.table-border {
  border: 1px solid black;
}

.card-padding {
  padding-left: 15px;
  padding-bottom: 20px;
}

.entry-table {
  padding-bottom: 20px;
}

.master-sheet-content {
  max-width: 100%;
}

.pool-percent-input {
  width: 60px;
}

.pool-percent-saved {
  color: green;
  font-size: 0.85em;
  margin-left: 6px;
}

.tournament-status-control {
  margin-top: 8px;
}

.tournament-status-control select {
  margin-left: 8px;
}

.tournament-closed-notice {
  margin-top: 6px;
  padding: 8px;
  background-color: #fff3cd;
  color: #664d03;
  border-radius: 4px;
  font-size: 0.9em;
}
</style>
