import fs from 'fs';
import path from 'path';
import { execFile, execFileSync, spawn } from 'child_process';
import { HOME, PLATFORM, loadJson, saveJson, killProcess, shellSpawn, hasCommand, spawnPipe, localPlayerArgs } from '../infra.mjs';

const stateFile = path.join(HOME, 'player.json');
const playlistFile = path.join(HOME, 'playlist.json');
const historyFile = path.join(HOME, 'player-history.json');
const tasteFile = path.join(HOME, 'music-taste.json');
const autoplayScript = path.join(HOME, 'autoplay.sh');
const queueFile = path.join(HOME, 'autoplay-queue.json');

class MusicTools {
  get tools() {
    return {
      play_music: {
        description: 'Smart music player with taste learning.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search term, URL, or mood' },
            action: { type: 'string', enum: ['play', 'stop', 'pause', 'status', 'playlist', 'next', 'prev', 'add', 'remove', 'autoplay', 'like', 'dislike', 'taste', 'history', 'radio'] },
            source: { type: 'string', enum: ['local', 'youtube'] },
          },
        },
        handler: (args) => this.#handlePlayMusic(args),
      },
    };
  }

  #getState() { return loadJson(stateFile, { pid: null, paused: false, file: null, playlistIdx: 0, autoplay: false }); }
  #getTaste() { return loadJson(tasteFile, { liked: [], disliked: [], artists: {}, moods: {} }); }

  #killCurrent(state) {
    if (state.pid) {
      killProcess(state.pid);
      // Process groups only exist on Unix
      if (PLATFORM !== 'win32') {
        try { process.kill(-state.pid, 'SIGTERM'); } catch {}
      }
    }
  }

  #addHistory(title, query) {
    const history = loadJson(historyFile, []);
    history.push({ title, query, ts: new Date().toISOString() });
    if (history.length > 100) history.splice(0, history.length - 100);
    saveJson(historyFile, history);
    const taste = this.#getTaste();
    const parts = title.split(' - ');
    if (parts.length >= 2) {
      taste.artists[parts[0].trim()] = (taste.artists[parts[0].trim()] || 0) + 1;
      saveJson(tasteFile, taste);
    }
  }

  #writeAutoplayScriptFile() {
    // Shell-escape paths to prevent injection if HOME contains special chars
    const esc = (s) => "'" + s.replace(/'/g, "'\\''") + "'";
    const script = `#!/bin/bash
trap '' HUP
QUEUE_FILE=${esc(queueFile)}
STATE_FILE=${esc(stateFile)}
play_from_queue() {
  QUERY=$(node -e "const q=JSON.parse(require('fs').readFileSync(process.argv[1],'utf-8'));if(q.length){console.log(q[0].query);q.shift();require('fs').writeFileSync(process.argv[1],JSON.stringify(q,null,2));}else{process.exit(1);}" "$QUEUE_FILE" 2>/dev/null)
  if [ $? -ne 0 ] || [ -z "$QUERY" ]; then return 1; fi
  TITLE=$(yt-dlp --get-title "ytsearch1:$QUERY" 2>/dev/null | head -1)
  node -e 'const fs=require("fs"),t=process.argv[1],s=JSON.parse(fs.readFileSync(process.argv[2],"utf-8"));s.file=t;fs.writeFileSync(process.argv[2],JSON.stringify(s));' "$TITLE" "$STATE_FILE" 2>/dev/null
  yt-dlp -f "bestaudio" -o - "ytsearch1:$QUERY" 2>/dev/null | ffplay -nodisp -autoexit -loglevel quiet -
}
while true; do
  AUTOPLAY=$(cat "$STATE_FILE" 2>/dev/null | grep -o '"autoplay":true' || echo "")
  if [ -z "$AUTOPLAY" ]; then exit 0; fi
  play_from_queue || exit 0
  sleep 1
done`;
    fs.writeFileSync(autoplayScript, script, { mode: 0o755 });
  }

  async #streamYoutube(query, enableAutoplay, mood) {
    if (!hasCommand('yt-dlp')) return '\u274C yt-dlp not installed.';
    if (!hasCommand('ffplay')) return '\u274C ffplay not found.';
    const state = this.#getState();
    let isYoutubeUrl = false;
    try {
      const parsed = new URL(query);
      const host = parsed.hostname.toLowerCase();
      isYoutubeUrl = host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be' || host.endsWith('.youtu.be');
    } catch {
      isYoutubeUrl = false;
    }
    const ytQuery = isYoutubeUrl ? query : `ytsearch1:${query}`;
    this.#killCurrent(state);
    const autoplay = enableAutoplay !== undefined ? enableAutoplay : state.autoplay;

    const child = spawnPipe('yt-dlp', ['-f', 'bestaudio', '-o', '-', ytQuery], 'ffplay', ['-nodisp', '-autoexit', '-loglevel', 'quiet', '-']);
    if (autoplay) {
      this.#writeAutoplayScriptFile();
      const ap = shellSpawn('bash', [autoplayScript]);
      ap.unref();
    }
    saveJson(stateFile, { pid: child.pid, paused: false, file: query, playlistIdx: state.playlistIdx, autoplay });
    this.#addHistory(query, query);

    execFile('yt-dlp', ['--get-title', ytQuery], { timeout: 15000 }, (err, stdout) => {
      const title = (!err && stdout.trim()) ? stdout.trim() : query;
      const cur = loadJson(stateFile, state);
      if (cur.pid !== child.pid) return; // stale — another track started
      cur.file = title; saveJson(stateFile, cur);
      this.#addHistory(title, query);
      if (autoplay) {
        const searchQ = mood ? `${mood} songs like ${title}` : `${title} similar vibe`;
        try {
          const titles = execFileSync('yt-dlp', ['--get-title', `ytsearch3:${searchQ}`], { encoding: 'utf-8', timeout: 20000 }).trim().split('\n').filter(Boolean);
          const t = this.#getTaste();
          saveJson(queueFile, titles.filter(x => !t.disliked.includes(x)).map(x => ({ title: x, query: x })));
        } catch { saveJson(queueFile, []); }
      }
    });
    return `\uD83C\uDFB5 Playing: ${query}${autoplay ? ' (autoplay: on)' : ''}`;
  }

  async #handlePlayMusic(args) {
    const action = args.action || 'play';
    const state = this.#getState();
    const playlist = loadJson(playlistFile, []);
    const taste = this.#getTaste();

    if (action === 'like') {
      const song = args.query || state.file;
      if (!song) return 'Nothing to like.';
      if (!taste.liked.includes(song)) { taste.liked.push(song); taste.disliked = taste.disliked.filter(s => s !== song); saveJson(tasteFile, taste); }
      return `\u2764\uFE0F Liked: ${song} (${taste.liked.length} total likes)`;
    }
    if (action === 'dislike') {
      const song = args.query || state.file;
      if (!song) return 'Nothing to dislike.';
      if (!taste.disliked.includes(song)) { taste.disliked.push(song); taste.liked = taste.liked.filter(s => s !== song); saveJson(tasteFile, taste); }
      return `\uD83D\uDC4E Disliked: ${song}`;
    }
    if (action === 'taste') {
      const top = Object.entries(taste.artists).sort((a, b) => b[1] - a[1]).slice(0, 10);
      return `\uD83C\uDFB5 Liked: ${taste.liked.length}\nTop artists: ${top.map(([a, n]) => `${a}(${n}x)`).join(', ') || 'none yet'}`;
    }
    if (action === 'history') {
      const h = loadJson(historyFile, []);
      if (!h.length) return 'No history.';
      return h.slice(-15).reverse().map((x, i) => `${i + 1}. ${x.title}`).join('\n');
    }
    if (action === 'radio') {
      const mood = args.query || null;
      if (mood) { taste.moods[mood] = (taste.moods[mood] || 0) + 1; saveJson(tasteFile, taste); }
      const topA = Object.entries(taste.artists).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a]) => a);
      const q = mood ? `${mood} songs like ${taste.liked.slice(-1)[0] || topA[0] || 'pop hits'}` : `songs similar to ${taste.liked.slice(-1)[0] || 'popular 2025'}`;
      return await this.#streamYoutube(q, true, mood);
    }
    if (action === 'autoplay') {
      state.autoplay = !state.autoplay;
      saveJson(stateFile, state);
      return state.autoplay ? '\uD83D\uDD04 Autoplay ON.' : '\u23F9 Autoplay OFF.';
    }
    if (action === 'stop') {
      if (!state.pid) return '\u23F9 Nothing playing.';
      this.#killCurrent(state);
      saveJson(stateFile, { pid: null, paused: false, file: null, playlistIdx: state.playlistIdx, autoplay: state.autoplay });
      return '\u23F9 Stopped.';
    }
    if (action === 'pause') {
      if (!state.pid) return 'Nothing playing.';
      if (PLATFORM === 'win32') return 'Pause not supported on Windows.';
      const pid = parseInt(state.pid);
      if (!Number.isFinite(pid) || pid <= 0) return 'Invalid player state.';
      try { process.kill(pid, state.paused ? 'SIGCONT' : 'SIGSTOP'); } catch {}
      state.paused = !state.paused;
      saveJson(stateFile, state);
      return state.paused ? '\u23F8 Paused.' : '\u25B6\uFE0F Resumed.';
    }
    if (action === 'status') {
      if (!state.pid || !state.file) return '\u23F9 Nothing playing.';
      try { process.kill(state.pid, 0); } catch { return '\u23F9 Nothing playing.'; }
      return `${state.paused ? '\u23F8' : '\u25B6\uFE0F'} ${state.file}${state.autoplay ? ' (autoplay: on)' : ''}`;
    }
    if (action === 'playlist') {
      if (!playlist.length) return 'Playlist empty.';
      return playlist.map((s, i) => `${i === state.playlistIdx ? '\u25B6' : ' '} ${i + 1}. ${s.title}`).join('\n');
    }
    if (action === 'next' || action === 'prev') {
      if (!playlist.length) return 'Playlist empty.';
      const idx = action === 'next' ? (state.playlistIdx + 1) % playlist.length : (state.playlistIdx - 1 + playlist.length) % playlist.length;
      state.playlistIdx = idx;
      return await this.#streamYoutube(playlist[idx].query);
    }
    if (action === 'add') {
      if (!args.query) return 'Need a song name.';
      playlist.push({ title: args.query, query: args.query });
      saveJson(playlistFile, playlist);
      return `\u2705 Added "${args.query}" (${playlist.length} tracks)`;
    }
    if (action === 'remove') {
      const idx = parseInt(args.query) - 1;
      if (idx >= 0 && idx < playlist.length) {
        const removed = playlist.splice(idx, 1)[0];
        saveJson(playlistFile, playlist);
        return `\uD83D\uDDD1 Removed "${removed.title}"`;
      }
      return 'Invalid track number.';
    }
    if (!args.query) return 'Need a search term or URL.';
    const asIdx = parseInt(args.query) - 1;
    if (!isNaN(asIdx) && asIdx >= 0 && asIdx < playlist.length) return await this.#streamYoutube(playlist[asIdx].query);
    if (args.source === 'local' || fs.existsSync(args.query)) {
      this.#killCurrent(state);
      const { cmd, args: playerArgs } = localPlayerArgs(args.query);
      const child = spawn(cmd, playerArgs, { detached: true, stdio: 'ignore' });
      child.unref();
      saveJson(stateFile, { pid: child.pid, paused: false, file: path.basename(args.query), playlistIdx: state.playlistIdx, autoplay: state.autoplay });
      return `\uD83C\uDFB5 ${path.basename(args.query)}`;
    }
    return await this.#streamYoutube(args.query);
  }
}

export default new MusicTools().tools;
