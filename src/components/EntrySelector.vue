<template>
  <div class="entry-selector">
    <div v-if="value" class="entry-selector-current">
      <span class="entry-selector-name">{{ value.name }}</span>
      <span v-if="value.tournament && value.tournament.name" class="entry-selector-tournament">— {{ value.tournament.name }}</span>
      <span class="entry-selector-switch link decorated-link" @click="$emit('input', null)">Switch entry</span>
    </div>
    <div v-else>
      <div class="header-ribbon">
        <div class="md-title">Select an Entry</div>
      </div>
      <div class="table-wrapper">
        <table class="entry-selector-table">
          <thead>
            <tr>
              <th>Entry</th>
              <th>Tournament</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in sortedEntries" :key="item.id" class="entry-selector-row" @click="$emit('input', item)">
              <td><span class="link">{{ item.name }}</span></td>
              <td>{{ item.tournament && item.tournament.name }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "EntrySelector",
  props: {
    entries: {
      type: Array,
      required: true
    },
    // Enables v-model="selectedEntry" in parent components - emits 'input'
    // with the clicked entry (or null, via "Switch entry") just like the
    // <select> it replaces did with v-model.
    value: {
      type: Object,
      default: null
    }
  },
  computed: {
    sortedEntries() {
      return [...this.entries].sort((a, b) => parseInt(b.createdAt) - parseInt(a.createdAt));
    }
  }
}
</script>

<style scoped>
.header-ribbon {
  background: #474C45;
  border-radius: 4px 4px 0 0;
  padding: 16px 24px;
}

.header-ribbon .md-title {
  color: #fff;
  text-align: center;
  font-weight: bold;
}

.table-wrapper {
  overflow: auto;
  border: 1px solid rgba(0, 0, 0, .12);
  border-top: none;
  border-radius: 0 0 4px 4px;
}

.entry-selector-table {
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
  font-size: 14px;
}

.entry-selector-table th,
.entry-selector-table td {
  padding: 12px 16px;
  text-align: center;
  border-bottom: 1px solid rgba(0, 0, 0, .12);
}

.entry-selector-table thead th {
  background: #dbe4d6;
  font-size: 12px;
  font-weight: 600;
  color: #474C45;
}

.entry-selector-table tbody tr:last-child td {
  border-bottom: none;
}

.entry-selector-row {
  cursor: pointer;
}

.entry-selector-row:hover td {
  background-color: #f5f5f5;
}

.entry-selector-current {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px;
  margin-bottom: 8px;
  font-size: 17px;
  background: #eef4ec;
  border-left: 4px solid #24E22C;
  border-radius: 4px;
}

.entry-selector-name {
  font-weight: 600;
}

.entry-selector-tournament {
  color: #666;
}

.entry-selector-switch {
  margin-left: auto;
  font-size: 0.85em;
}
</style>
