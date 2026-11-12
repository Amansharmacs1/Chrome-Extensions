/**
 * QRQuick - Storage Service & Persistence Unit Tests
 */

import {
  initStorage,
  getHistory,
  saveHistoryItem,
  updateHistoryItem,
  deleteHistoryItem,
  clearHistory,
  getScanHistory,
  saveScanResult,
  deleteScanItem,
  clearScanHistory,
  getPresets,
  savePreset,
  deletePreset,
  getSettings,
  updateSettings,
  getStorageStats,
  exportAllData,
  clearAllData
} from '../services/storage-service.js';

export async function runStorageTests() {
  const assertions = [];
  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Storage Test Failed: ${message}`);
    }
    assertions.push(message);
  }

  // 1. Storage Initialization & Reset
  await initStorage();
  await clearAllData();

  const emptyHistory = await getHistory();
  assert(Array.isArray(emptyHistory) && emptyHistory.length === 0, 'Initial history is empty');

  // 2. Save and retrieve generated QR
  const savedItem = await saveHistoryItem({
    type: 'url',
    title: 'My Project',
    payload: 'https://github.com/my-project',
    isFavorite: false
  });
  assert(Boolean(savedItem.id), 'Saved item assigned an ID');
  assert(savedItem.title === 'My Project', 'Saved item title preserved');

  const history1 = await getHistory();
  assert(history1.length === 1, 'History has 1 item');
  assert(history1[0].id === savedItem.id, 'History item matches saved ID');

  // 3. Update history item (toggle favorite)
  const updated = await updateHistoryItem(savedItem.id, { isFavorite: true, title: 'Renamed Project' });
  assert(updated !== null && updated.isFavorite === true, 'Updated favorite to true');
  assert(updated.title === 'Renamed Project', 'Updated title');

  // 4. Save and retrieve scan result
  const scanRecord = await saveScanResult({
    decodedText: 'WIFI:S:GuestNet;T:WPA;P:guest123;;',
    recognizedType: 'wifi',
    title: 'Wi-Fi: GuestNet',
    isUrl: false
  });
  assert(Boolean(scanRecord.id), 'Scan record assigned an ID');

  const scans = await getScanHistory();
  assert(scans.length === 1, 'Scan history has 1 record');
  assert(scans[0].recognizedType === 'wifi', 'Scan type preserved');

  // 5. Presets Management
  const presets = await getPresets();
  assert(presets.length >= 5, `Built-in presets loaded (count: ${presets.length})`);

  const customPreset = await savePreset({
    name: 'Custom Neon',
    fgColor: '#10B981',
    bgColor: '#000000',
    pattern: 'dots'
  });
  assert(Boolean(customPreset.id), 'Custom preset saved with ID');

  const afterPresetSave = await getPresets();
  assert(afterPresetSave.some(p => p.id === customPreset.id), 'Custom preset retrieved in list');

  const deletedPreset = await deletePreset(customPreset.id);
  assert(deletedPreset === true, 'Custom preset deleted successfully');

  // Cannot delete built-in presets
  const cantDeleteBuiltIn = await deletePreset(presets[0].id);
  assert(cantDeleteBuiltIn === false, 'Refuses to delete built-in preset');

  // 6. Settings Updates
  const defaultSettings = await getSettings();
  assert(defaultSettings.promptConfirmOnUrl === true, 'Default promptConfirmOnUrl is true');

  const updatedSettings = await updateSettings({ promptConfirmOnUrl: false, defaultSize: 1024 });
  assert(updatedSettings.promptConfirmOnUrl === false, 'Updated promptConfirmOnUrl to false');
  assert(updatedSettings.defaultSize === 1024, 'Updated defaultSize to 1024');

  // 7. Storage Statistics
  const stats = await getStorageStats();
  assert(stats.totalGenerated === 1, 'Stats totalGenerated is 1');
  assert(stats.totalScanned === 1, 'Stats totalScanned is 1');
  assert(stats.totalFavorites === 1, 'Stats totalFavorites is 1');

  // 8. Full Backup Export
  const backup = await exportAllData();
  assert(backup.app === 'QRQuick', 'Backup app identifier is QRQuick');
  assert(Array.isArray(backup.data.history), 'Backup contains history array');
  assert(Array.isArray(backup.data.scanHistory), 'Backup contains scanHistory array');

  // 9. Deletions
  const delGen = await deleteHistoryItem(savedItem.id);
  assert(delGen === true, 'Deleted generated history item');
  const emptyAfterDel = await getHistory();
  assert(emptyAfterDel.length === 0, 'History empty after deletion');

  const delScan = await deleteScanItem(scanRecord.id);
  assert(delScan === true, 'Deleted scan record');

  return assertions;
}
