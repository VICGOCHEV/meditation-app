'use strict';

// Auto-detect mp3/aac duration after a Practice is created or updated.
// Reads the uploaded audio file from Strapi's local filesystem
// (public/uploads/...) with `music-metadata`, rounds to seconds, and
// writes the result into `duration_sec` via a low-level knex query —
// db.query().update() would re-fire afterUpdate and recurse.
//
// Dependency: `npm install music-metadata` inside the Strapi project.

const path = require('node:path');

async function readDurationSec(absolutePath) {
  try {
    const mm = await import('music-metadata');
    const meta = await mm.parseFile(absolutePath);
    const d = meta?.format?.duration;
    return Number.isFinite(d) ? Math.round(d) : null;
  } catch (err) {
    strapi.log.warn(`[practice.lifecycles] duration probe failed for ${absolutePath}: ${err.message}`);
    return null;
  }
}

async function syncDuration(event) {
  const { result } = event;
  if (!result?.id) return;

  // Repopulate with audio so we get the uploaded file URL.
  const practice = await strapi.db
    .query('api::practice.practice')
    .findOne({ where: { id: result.id }, populate: { audio: true } });

  if (!practice?.audio?.url) return;

  // Strapi serves uploads from /uploads/<file>. The static root maps
  // to <project>/public, so we just join.
  const publicDir = strapi.dirs?.static?.public ||
    path.join(strapi.dirs.app.root, 'public');
  const filePath = path.join(publicDir, practice.audio.url);

  const dur = await readDurationSec(filePath);
  if (dur == null) return;
  if (Number(practice.duration_sec) === dur) return; // no change → no recurse

  // Knex-level update — bypasses entity-service lifecycles, so no recursion.
  const tableName = strapi.db
    .metadata.get('api::practice.practice')
    .tableName;
  await strapi.db
    .connection(tableName)
    .where({ id: result.id })
    .update({ duration_sec: dur });

  strapi.log.info(`[practice.lifecycles] ${practice.title} → ${dur}s`);
}

module.exports = {
  async afterCreate(event) {
    await syncDuration(event);
  },
  async afterUpdate(event) {
    await syncDuration(event);
  },
};
