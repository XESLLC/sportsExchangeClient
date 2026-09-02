<template>
  <div v-if="isPageReady" class="content-container">
    <div v-if="!entries">
      You currently have no entries. Click <span class="link decorated-link" @click="$router.push({ name: 'Exchanges' })">here</span> to browse open contests.
    </div>
    <div v-else>
      <md-card>
        <md-card-header>
          <breadcrumbs :crumbs="breadcrumbCrumbs"></breadcrumbs>
          <div class="md-title">Portfolio</div>
        </md-card-header>

        <md-tabs v-if="selectedEntry" md-alignment="centered">
          <md-tab md-label="Detail" @click="showContent('detail')"></md-tab>
          <md-tab md-label="Investment Metrics" @click="showContent('summary')"></md-tab>
          <md-tab md-label="Dividend Payouts" @click="showContent('payouts')"></md-tab>
          <md-tab md-label="Rankings" @click="showContent('rankings')"></md-tab>
          <md-tab md-label="Owners" @click="showContent('owners')"></md-tab>
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
            <div v-if="successMessage" class="alert-padding alert-success">
              {{successMessage}}
              <span @click="successMessage = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
            </div>
            <portfolio-detail v-if="contentToShow === 'detail'" :entry-id="selectedEntry.id" :is-ipo-open="selectedEntry.isIpoOpen"></portfolio-detail>
            <portfolio-summary v-if="contentToShow === 'summary'" :entry-id="selectedEntry.id" :tournament-id="selectedEntry.tournamentId"></portfolio-summary>
            <div v-if="contentToShow === 'payouts'" class="payouts-container">
              <h1 class="md-title payouts-title">Current Payouts</h1>
              <div class="table-wrapper">
                <table class="payouts-table">
                  <thead>
                    <tr>
                      <th class="col-team sortable" @click="sortPayouts('teamName')">Team Name <span class="sort-icon">{{ payoutSortIcon('teamName') }}</span></th>
                      <th class="sortable" @click="sortPayouts('ipoPrice')">IPO Price <span class="sort-icon">{{ payoutSortIcon('ipoPrice') }}</span></th>
                      <th v-if="hasSeed" class="sortable" @click="sortPayouts('seed')">Seed <span class="sort-icon">{{ payoutSortIcon('seed') }}</span></th>
                      <th v-if="hasRegion" class="sortable" @click="sortPayouts('region')">Region <span class="sort-icon">{{ payoutSortIcon('region') }}</span></th>
                      <th v-if="hasWins" class="sortable" @click="sortPayouts('wins')">Wins <span class="sort-icon">{{ payoutSortIcon('wins') }}</span></th>
                      <th v-for="milestone in maxMilestoneData" :key="milestone.milestoneId">{{ milestone.milestoneName }} Dividend</th>
                      <th class="sortable" @click="sortPayouts('totalDividend')">Total Dividend <span class="sort-icon">{{ payoutSortIcon('totalDividend') }}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in sortedPayouts" :key="item.id">
                      <td class="col-team">{{ item.teamName }}</td>
                      <td>{{ item.ipoPrice | toCurrency }}</td>
                      <td v-if="hasSeed">{{ item.seed }}</td>
                      <td v-if="hasRegion">{{ item.region }}</td>
                      <td v-if="hasWins">{{ item.milestoneData && item.milestoneData[0] ? item.milestoneData[0].wins : '-' }}</td>
                      <td v-for="(milestone, index) in maxMilestoneData" :key="milestone.milestoneId">
                        <span v-if="item.milestoneData && item.milestoneData[index]">{{ truncateDecimals(item.milestoneData[index].dividendPrice / item.numStocksInCirculation, 2) | toCurrency }}</span>
                        <span v-else>-</span>
                      </td>
                      <td>{{ getTotalDividendAmountForTeam(item) | toCurrency }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <portfolio-rankings v-if="contentToShow === 'rankings'" :entry-id="selectedEntry.id" :tournament-id="selectedEntry.tournamentId"></portfolio-rankings>
            <entry-owners v-if="contentToShow === 'owners'" :entry-id="selectedEntry.id"></entry-owners>
          </div>
        </md-card-content>
      </md-card>
    </div>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';
import PortfolioSummary from './PortfolioSummary.vue';
import PortfolioDetail from './PortfolioDetail.vue';
import PortfolioRankings from './PortfolioRankings.vue';
import EntrySelector from './EntrySelector.vue';
import Breadcrumbs from './Breadcrumbs.vue';
import EntryOwners from './EntryOwners.vue';
import { getLastEntryId, setLastEntryId } from '../utils/lastEntry';

export default {
  components: { PortfolioSummary, PortfolioDetail, PortfolioRankings, EntrySelector, Breadcrumbs, EntryOwners },
  name: "Portfolio",
  data() {
    return {
      isPageReady: false,
      entries: null,
      selectedEntry: null,
      contentToShow: 'detail',
      tournamentTeamData: [],
      maxLengthOfMilestoneData: 0,
      leagueName: null,
      payoutSortField: 'teamName',
      payoutSortOrder: 'asc'
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
    async selectedEntry(val) {
      if(val) {
        setLastEntryId(val.id);
        this.leagueName = null;
        await this.fetchLeagueName();
        await this.fetchPayoutData();
      }
    }
  },
  computed: {
    hasSeed() {
      return this.tournamentTeamData.some(t => t.seed);
    },
    hasRegion() {
      return this.tournamentTeamData.some(t => t.region);
    },
    hasWins() {
      return this.tournamentTeamData.some(t => t.milestoneData && t.milestoneData.length > 0);
    },
    sortedPayouts() {
      return [...this.tournamentTeamData].sort((a, b) => {
        let aVal, bVal;
        if (this.payoutSortField === 'wins') {
          aVal = a.milestoneData && a.milestoneData[0] ? a.milestoneData[0].wins : 0;
          bVal = b.milestoneData && b.milestoneData[0] ? b.milestoneData[0].wins : 0;
        } else if (this.payoutSortField === 'totalDividend') {
          aVal = this.getTotalDividendAmountForTeam(a);
          bVal = this.getTotalDividendAmountForTeam(b);
        } else {
          aVal = a[this.payoutSortField];
          bVal = b[this.payoutSortField];
        }
        const dir = this.payoutSortOrder === 'asc' ? 1 : -1;
        if (typeof aVal === 'string') return dir * (aVal || '').localeCompare(bVal || '');
        return dir * ((aVal || 0) - (bVal || 0));
      });
    },
    breadcrumbCrumbs() {
      const crumbs = [{ label: 'Home', to: { name: 'Home' } }];
      if(!this.selectedEntry) {
        crumbs.push({ label: 'Portfolio' });
        return crumbs;
      }
      const leagueId = this.selectedEntry.tournament && this.selectedEntry.tournament.leagueId;
      if(this.leagueName && leagueId) {
        crumbs.push({ label: this.leagueName, to: { name: 'League', params: { leagueId } } });
      }
      if(this.selectedEntry.tournament && this.selectedEntry.tournament.name) {
        crumbs.push({ label: this.selectedEntry.tournament.name, to: { name: 'TournamentHome', params: { tournamentId: this.selectedEntry.tournamentId } } });
      }
      crumbs.push({ label: this.selectedEntry.name });
      return crumbs;
    }
  },
  methods: {
    sortPayouts(field) {
      if (this.payoutSortField === field) {
        this.payoutSortOrder = this.payoutSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        this.payoutSortField = field;
        this.payoutSortOrder = field === 'teamName' || field === 'region' ? 'asc' : 'desc';
      }
    },
    payoutSortIcon(field) {
      if (this.payoutSortField !== field) return '⇅';
      return this.payoutSortOrder === 'asc' ? '▲' : '▼';
    },
    getTotalDividendAmountForTeam(tournamentTeam) {
      if(tournamentTeam.milestoneData) {
        const totalDivendend = tournamentTeam.milestoneData.reduce((result, milestoneData) => {
          return result += milestoneData.dividendPrice;
        }, 0);
        return this.truncateDecimals(totalDivendend / tournamentTeam.numStocksInCirculation, 2);
      } else {
        return 0;
      }
    },
    async fetchPayoutData() {
      const response = await apolloClient.query({
      fetchPolicy: 'no-cache',
        query: gql`
          query TournamentTeams($tournamentId: ID!) {
            tournamentTeams(tournamentId: $tournamentId) {
              id,
              teamId,
              teamName,
              ipoPrice,
              seed,
              region,
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
          tournamentId: this.selectedEntry.tournamentId
        }
      });

      this.tournamentTeamData = response.data.tournamentTeams;
      const tournamentTeamData = [...this.tournamentTeamData];
      this.maxLengthOfMilestoneData = tournamentTeamData.reduce((result, teamData) => {
        const milestoneDataLength = teamData.milestoneData ? teamData.milestoneData.length: 0;
        const max = Math.max(result, milestoneDataLength);
        if(max === milestoneDataLength) {
          this.maxMilestoneData = teamData.milestoneData;
        }
        return max;
      }, 0);
    },
    async fetchLeagueName() {
      const leagueId = this.selectedEntry && this.selectedEntry.tournament && this.selectedEntry.tournament.leagueId;
      if(!leagueId) { return; }
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
            id: leagueId
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
                leagueId,
                isIpoOpen,
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
        variables: {
          email
        }
      });

      this.entries = response.data.userEntries;
      this.entries = this.entries.filter(entry => entry.tournament.status !== 'inactive');

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
    showContent(content) {
      this.contentToShow = content;
    },
    truncateDecimals(number, digits) {
      const multiplier = Math.pow(10, digits);
      const adjustedNum = number * multiplier;
      const truncatedNum = Math[adjustedNum < 0 ? 'ceil' : 'floor'](adjustedNum);

      return truncatedNum / multiplier;
    }
  },
  async created() {
    await this.fetchUserEntries();
    if(this.selectedEntry) {
      await this.fetchPayoutData();
    }
    this.isPageReady = true;
  }
}
</script>

<style scoped>
.alert-padding {
  margin-top: 20px;
}

.payouts-container {
  padding-top: 20px;
  width: 100%;
}

.payouts-title {
  margin-bottom: 12px;
}

.table-wrapper {
  overflow: auto;
  max-height: calc(100vh - 300px);
  border: 1px solid rgba(0, 0, 0, .12);
}

.payouts-table {
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  white-space: nowrap;
}

.payouts-table th,
.payouts-table td {
  padding: 8px 16px;
  text-align: left;
  border-bottom: 1px solid rgba(0, 0, 0, .12);
}

.payouts-table thead th {
  position: sticky;
  top: 0;
  background: #f5f5f5;
  z-index: 2;
  font-size: 12px;
  font-weight: 500;
}

.payouts-table .sortable {
  cursor: pointer;
  user-select: none;
}

.payouts-table .sortable:hover {
  background: #ebebeb;
}

.sort-icon {
  font-size: 10px;
  color: #888;
  margin-left: 4px;
}

.payouts-table .col-team {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #fff;
  min-width: 140px;
  border-right: 2px solid #ddd;
}

.payouts-table thead .col-team {
  z-index: 4;
  background: #f5f5f5;
}

.payouts-table tbody tr:hover td {
  background: #f9f9f9;
}

.payouts-table tbody tr:hover .col-team {
  background: #f0f0f0;
}

@media screen and (max-width: 600px) {
  .payouts-table .col-team {
    position: static;
    border-right: none;
  }

  .payouts-table thead .col-team {
    position: sticky;
    top: 0;
    z-index: 2;
  }
}
</style>