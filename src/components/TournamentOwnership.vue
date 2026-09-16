<template>
  <div v-if="isPageReady" class="content-container">
    <md-card class="section-card">
      <md-card-header class="header-ribbon">
        <div class="md-title exchange-home-label">Exchange Home</div>
        <div class="md-title title-select-wrapper">
          <span>{{ tournamentName }}</span>
        </div>
      </md-card-header>

      <md-card-content>
        <div class="back-link-row">
          <span class="link decorated-link" @click="goToExchangeHome">&larr; Back to Exchange Home</span>
        </div>
        <div class="md-title section-heading">All Stock Ownership</div>
        <p class="intro">
          Shares each portfolio currently holds of each team. Use it to find a trade partner, then propose a trade from your Portfolio.
        </p>

        <div class="controls">
          <span class="link decorated-link" @click="toggleOrientation">
            Show {{ orientation === 'byPortfolio' ? 'teams as rows' : 'portfolios as rows' }}
          </span>
          <span class="link decorated-link csv-link" @click="toggleMetric">
            Show {{ metric === 'shares' ? '% of team owned' : 'share counts' }}
          </span>
          <span v-if="rows.length" class="link decorated-link csv-link" @click="downloadCsv">
            Download CSV (opens in Excel)
          </span>
        </div>

        <div v-if="rows.length === 0" class="empty">No entries in this exchange yet.</div>

        <div v-else class="ownership-scroll">
          <table class="ownership-table">
            <thead>
              <tr>
                <th class="corner">{{ orientation === 'byPortfolio' ? 'Portfolio' : 'Team' }}</th>
                <th
                  v-for="col in columns"
                  :key="col.id"
                  :class="{ eliminated: col.isEliminated }"
                >{{ col.label }}</th>
                <th class="total-col">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id">
                <th class="row-head" :class="{ eliminated: row.isEliminated }">
                  {{ row.label }}
                  <div v-if="row.sublabel" class="row-sublabel">{{ row.sublabel }}</div>
                </th>
                <td
                  v-for="col in columns"
                  :key="col.id"
                  :class="{ zero: cellRaw(row.id, col.id) === 0 }"
                >{{ cellDisplay(row.id, col.id) }}</td>
                <td class="total-col">{{ row.total }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th class="row-head">Total</th>
                <td v-for="col in columns" :key="col.id">{{ col.total }}</td>
                <td class="total-col">{{ grandTotal }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </md-card-content>
    </md-card>
  </div>
  <div v-else class="spinner-container">
    <md-progress-spinner class="spinner-primary" md-mode="indeterminate"></md-progress-spinner>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';

export default {
  name: "TournamentOwnership",
  props: {
    tournamentId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      isPageReady: false,
      tournamentName: '',
      teams: [],
      portfolios: [],
      sharesByKey: {},
      orientation: 'byPortfolio',
      metric: 'shares'
    }
  },
  computed: {
    teamTotalsById() {
      const map = {};
      this.teams.forEach(t => { map[t.tournamentTeamId] = t.totalShares; });
      return map;
    },
    rows() {
      return this.orientation === 'byPortfolio' ? this.portfolioAxis : this.teamAxis;
    },
    columns() {
      return this.orientation === 'byPortfolio' ? this.teamAxis : this.portfolioAxis;
    },
    portfolioAxis() {
      return this.portfolios.map(p => ({
        id: p.entryId,
        label: p.entryName,
        sublabel: p.ownerName,
        isEliminated: false,
        total: p.totalShares
      }));
    },
    teamAxis() {
      return this.teams.map(t => ({
        id: t.tournamentTeamId,
        label: t.teamName,
        sublabel: '',
        isEliminated: t.isEliminated,
        total: t.totalShares
      }));
    },
    grandTotal() {
      return this.portfolios.reduce((sum, p) => sum + p.totalShares, 0);
    }
  },
  methods: {
    toggleOrientation() {
      this.orientation = this.orientation === 'byPortfolio' ? 'byTeam' : 'byPortfolio';
    },
    toggleMetric() {
      this.metric = this.metric === 'shares' ? 'percent' : 'shares';
    },
    downloadCsv() {
      const esc = (v) => {
        const s = String(v == null ? '' : v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      const cornerLabel = this.orientation === 'byPortfolio' ? 'Portfolio' : 'Team';
      const lines = [];
      lines.push([cornerLabel, ...this.columns.map(c => c.label), 'Total'].map(esc).join(','));
      this.rows.forEach((row) => {
        const label = row.sublabel ? `${row.label} (${row.sublabel})` : row.label;
        const values = this.columns.map(c => {
          const display = this.cellDisplay(row.id, c.id);
          return display === '' ? (this.metric === 'shares' ? 0 : '0%') : display;
        });
        lines.push([label, ...values, row.total].map(esc).join(','));
      });
      lines.push(['Total', ...this.columns.map(c => c.total), this.grandTotal].map(esc).join(','));

      const BOM = String.fromCharCode(0xFEFF); // helps Excel read UTF-8
      const blob = new Blob([BOM + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = (this.tournamentName || 'exchange').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      a.href = url;
      a.download = `ownership-${safeName}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    cellRaw(rowId, colId) {
      const entryId = this.orientation === 'byPortfolio' ? rowId : colId;
      const teamId = this.orientation === 'byPortfolio' ? colId : rowId;
      return this.sharesByKey[entryId + '|' + teamId] || 0;
    },
    cellDisplay(rowId, colId) {
      const raw = this.cellRaw(rowId, colId);
      if (raw === 0) return '';
      if (this.metric === 'shares') return raw;
      const teamId = this.orientation === 'byPortfolio' ? colId : rowId;
      const teamTotal = this.teamTotalsById[teamId] || 0;
      if (!teamTotal) return '';
      return (raw / teamTotal * 100).toFixed(1) + '%';
    },
    goToExchangeHome() {
      this.$router.push({ name: 'TournamentHome', params: { tournamentId: this.tournamentId } });
    },
    async fetchTournament() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query Tournament($id: ID!) {
            tournament(id: $id) {
              id
              name
            }
          }
        `,
        variables: { id: this.tournamentId }
      });
      this.tournamentName = response.data.tournament.name;
    },
    async fetchOwnership() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query TournamentOwnership($tournamentId: ID!) {
            tournamentOwnership(tournamentId: $tournamentId) {
              teams {
                tournamentTeamId
                teamName
                isEliminated
                totalShares
              }
              portfolios {
                entryId
                entryName
                ownerName
                totalShares
                holdings {
                  tournamentTeamId
                  shares
                }
              }
            }
          }
        `,
        variables: { tournamentId: this.tournamentId }
      });

      const data = response.data.tournamentOwnership;
      this.teams = data.teams;
      this.portfolios = data.portfolios;

      const sharesByKey = {};
      data.portfolios.forEach(p => {
        p.holdings.forEach(h => {
          sharesByKey[p.entryId + '|' + h.tournamentTeamId] = h.shares;
        });
      });
      this.sharesByKey = sharesByKey;
    }
  },
  async created() {
    await Promise.all([this.fetchTournament(), this.fetchOwnership()]);
    this.isPageReady = true;
  }
}
</script>

<style scoped>
.section-card {
  margin-bottom: 24px;
}

.header-ribbon {
  background: #474C45;
  border-radius: 4px 4px 0 0;
  padding: 16px 24px !important;
}

.exchange-home-label {
  text-align: center;
  color: #8fe37e;
  margin-bottom: 4px;
}

.title-select-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-weight: bold;
  color: #fff;
}

.back-link-row {
  margin-bottom: 16px;
}

.section-heading {
  margin: 0 0 8px;
}

.intro {
  color: #555;
  margin: 0 0 12px;
}

.controls {
  margin-bottom: 12px;
}

.csv-link {
  margin-left: 16px;
}

.empty {
  color: #777;
  padding: 8px 0;
}

.ownership-scroll {
  overflow-x: auto;
}

.ownership-table {
  border-collapse: collapse;
  font-size: 0.9em;
}

.ownership-table th,
.ownership-table td {
  border: 1px solid #ddd;
  padding: 6px 10px;
  text-align: center;
  white-space: nowrap;
}

.ownership-table thead th {
  background: #f0f9ee;
  font-weight: bold;
  position: sticky;
  top: 0;
}

.ownership-table .corner,
.ownership-table .row-head {
  text-align: left;
  background: #f0f9ee;
  position: sticky;
  left: 0;
  z-index: 1;
}

.ownership-table thead .corner {
  z-index: 2;
}

.row-sublabel {
  font-weight: normal;
  color: #777;
  font-size: 0.85em;
}

.ownership-table td.zero {
  color: #ccc;
}

.ownership-table .total-col {
  font-weight: bold;
  background: #fafafa;
}

.ownership-table tfoot th,
.ownership-table tfoot td {
  font-weight: bold;
  background: #fafafa;
}

.ownership-table .eliminated {
  text-decoration: line-through;
  color: #999;
}

.spinner-container {
  text-align: center;
  padding: 40px;
}
</style>
