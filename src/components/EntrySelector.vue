<template>
  <div class="entry-selector">
    <div v-if="value" class="entry-selector-current">
      <span class="entry-selector-name">{{ value.name }}</span>
      <span v-if="value.tournament && value.tournament.name" class="entry-selector-tournament">— {{ value.tournament.name }}</span>
      <span class="entry-selector-switch link decorated-link" @click="$emit('input', null)">Switch entry</span>
    </div>
    <div v-else>
      <h3 class="label">Select an Entry</h3>
      <md-table :value="entries" class="entry-selector-table">
        <md-table-toolbar>
          <h1 class="md-title">Your Entries</h1>
        </md-table-toolbar>
        <md-table-row slot="md-table-row" slot-scope="{ item }" class="entry-selector-row" @click.native="$emit('input', item)">
          <md-table-cell md-label="Entry" md-sort-by="name"><span class="link">{{ item.name }}</span></md-table-cell>
          <md-table-cell md-label="Tournament" md-sort-by="tournament.name">{{ item.tournament && item.tournament.name }}</md-table-cell>
        </md-table-row>
      </md-table>
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
  }
}
</script>

<style scoped>
.entry-selector-table {
  width: 100%;
}

.entry-selector-row {
  cursor: pointer;
}

.entry-selector-row:hover {
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
