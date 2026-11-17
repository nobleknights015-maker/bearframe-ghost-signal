package labs.bearframe.ghostsignal;

import android.content.Context;
import android.graphics.BitmapFactory;
import android.net.Uri;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashSet;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Owner-directed, OFFLINE private Aeon data installer for the DEBUG test bay.
 * No screenplay, portraits or licensed images are bundled in public CI.
 *
 * A user-selected ZIP is treated as untrusted input. Only exact JSON and PNG
 * allow-listed paths are installed. JavaScript, HTML, and executable files
 * in the ZIP are ignored and can never override the app's runtime scripts.
 */
final class PrivateAeonAssets {
    private PrivateAeonAssets() {}
    private static final int MAX_ENTRIES = 2000;
    private static final long MAX_UNPACKED = 96L * 1024 * 1024;
    private static final long MAX_FILE = 24L * 1024 * 1024;
    private static final String[] ACTIONS = {
        "idle", "attack", "ranged", "cast", "guard", "hit", "down", "victory", "charge"
    };
    private static final String[] STARTERS = {
        "sleeper_A", "sleeper_B", "sleeper_C", "sleeper_D"
    };

    static File activeDirectory(Context context) {
        return new File(context.getFilesDir(), "owner-aeon-current");
    }

    private static boolean allowed(String path) {
        return path.equals("asset-manifest.json")
            || path.equals("story/campaign.json")
            || path.equals("story/opening-world-review-candidate.json")
            || path.matches("portraits/sleeper_[ABCD]\\.png")
            || path.matches("assets/(world|battlers)/[A-Za-z0-9_-]+\\.png");
    }

    private static String relative(String name) throws IOException {
        if (name.startsWith("/") || name.contains("\\") || name.indexOf('\0') >= 0
                || name.contains(":") || name.length() > 350)
            throw new IOException("Unsafe archive entry");
        for (String part : name.split("/")) {
            if (part.equals(".") || part.equals(".."))
                throw new IOException("Unsafe archive traversal");
        }
        String[] prefixes = {
            "frontend/public/assets/aeon/", "assets/aeon/", "aeon/"
        };
        for (String prefix : prefixes) {
            if (name.startsWith(prefix)) return name.substring(prefix.length());
        }
        // An archive can also be rooted at the contents of assets/aeon/.
        return name;
    }

    private static void removeTree(File file) throws IOException {
        if (!file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children == null) throw new IOException("Cannot inspect staging directory");
            for (File child : children) removeTree(child);
        }
        if (!file.delete()) throw new IOException("Cannot remove temporary content");
    }

    private static JSONObject readJson(File file) throws IOException, JSONException {
        try (InputStream in = new BufferedInputStream(new FileInputStream(file))) {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            byte[] buffer = new byte[16384];
            int count;
            while ((count = in.read(buffer)) != -1) {
                bytes.write(buffer, 0, count);
                if (bytes.size() > 8 * 1024 * 1024)
                    throw new IOException("Campaign JSON exceeds limit");
            }
            return new JSONObject(new String(bytes.toByteArray(), StandardCharsets.UTF_8));
        }
    }

    private static String sha256(File file) throws IOException {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream stream = new BufferedInputStream(new FileInputStream(file))) {
                byte[] data = new byte[16384];
                int n;
                while ((n = stream.read(data)) != -1) digest.update(data, 0, n);
            }
            char[] alphabet = "0123456789abcdef".toCharArray();
            byte[] bytes = digest.digest();
            char[] hex = new char[bytes.length * 2];
            for (int i = 0; i < bytes.length; i++) {
                int v = bytes[i] & 0xff;
                hex[i * 2] = alphabet[v >>> 4];
                hex[i * 2 + 1] = alphabet[v & 0xf];
            }
            return new String(hex);
        } catch (NoSuchAlgorithmException unavailable) {
            throw new IOException("SHA-256 unavailable", unavailable);
        }
    }

    private static File required(File root, String path) throws IOException {
        File file = new File(root, path);
        String parent = root.getCanonicalPath() + File.separator;
        if (!file.getCanonicalPath().startsWith(parent) || !file.isFile())
            throw new IOException("Incomplete private campaign package");
        return file;
    }

    private static void png(File root, String path, int width, int height)
            throws IOException {
        if (!path.matches("(assets/(world|battlers)/[A-Za-z0-9_-]+|portraits/sleeper_[ABCD])\\.png"))
            throw new IOException("Unexpected sprite path");
        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(required(root, path).getAbsolutePath(), options);
        if (options.outWidth != width || options.outHeight != height)
            throw new IOException("Approved sprite geometry mismatch");
    }

    private static void requireAnimation(JSONObject battle) throws JSONException, IOException {
        JSONObject actions = battle.getJSONObject("animations");
        for (int i = 0; i < ACTIONS.length; i++) {
            JSONObject action = actions.getJSONObject(ACTIONS[i]);
            int frames = action.getInt("frames");
            JSONArray durations = action.getJSONArray("durationsMs");
            if (action.getInt("row") != i || frames < 1 || frames > 6
                    || durations.length() != frames)
                throw new IOException("Invalid sprite animation layout");
            for (int j = 0; j < frames; j++) {
                int duration = durations.getInt(j);
                if (duration < 1 || duration > 10000)
                    throw new IOException("Invalid sprite animation timing");
            }
        }
    }

    private static int validate(File root) throws IOException, JSONException {
        JSONObject manifest = readJson(required(root, "asset-manifest.json"));
        File sourceStory = required(root, "story/campaign.json");
        JSONObject story = readJson(sourceStory);
        JSONObject world = readJson(required(root, "story/opening-world-review-candidate.json"));
        if (world.has("sourceDigest") &&
                !world.getString("sourceDigest").equalsIgnoreCase(sha256(sourceStory)))
            throw new IOException("Original Director's Cut source digest changed");

        if (!"aeon.asset-library.v4".equals(manifest.getString("schema"))
                || story.getInt("schemaVersion") != 1
                || world.getInt("schemaVersion") != 1
                || world.getInt("campaignRevision") != story.getInt("revision")
                || !"authored-blockout-review-candidate".equals(world.getString("status"))
                || world.getString("layoutDigest").isEmpty()
                || story.getJSONArray("scenes").length() == 0)
            throw new IOException("Source story and private layout do not match");

        JSONArray maps = world.getJSONArray("maps");
        Set<String> mapIds = new HashSet<>();
        for (int i = 0; i < maps.length(); i++) {
            if (!mapIds.add(maps.getJSONObject(i).getString("id")))
                throw new IOException("Duplicate source map");
        }
        if (maps.length() == 0 || !mapIds.contains(world.getString("startArea")))
            throw new IOException("Start area not present");

        JSONArray characters = manifest.getJSONArray("characters");
        if (characters.length() != 42)
            throw new IOException("Expected exactly 42 approved-structure characters");
        Set<String> ids = new HashSet<>();
        Set<String> worldPaths = new HashSet<>(), battlePaths = new HashSet<>();
        for (int i = 0; i < characters.length(); i++) {
            JSONObject art = characters.getJSONObject(i);
            String id = art.getString("id");
            if (!id.matches("[A-Za-z0-9_-]{1,64}") || !ids.add(id))
                throw new IOException("Duplicate or invalid art identity");
            JSONObject w = art.getJSONObject("world");
            JSONObject b = art.getJSONObject("battle");
            int ww = w.getInt("frameWidth"), wh = w.getInt("frameHeight");
            if (w.getInt("columns") != 9 || w.getInt("rows") != 4
                    || ww < 16 || ww > 256 || wh < 16 || wh > 256)
                throw new IOException("Invalid world sheet grid");
            JSONArray dirs = w.getJSONArray("directions");
            JSONArray walk = w.getJSONArray("walkColumns");
            String[] expectedDirs = {"down", "left", "right", "up"};
            if (dirs.length() != 4 || walk.length() != 8)
                throw new IOException("Invalid 4-way walk cycle");
            for (int j = 0; j < 4; j++) {
                if (!expectedDirs[j].equals(dirs.getString(j)))
                    throw new IOException("Invalid world direction");
            }
            for (int j = 0; j < 8; j++) {
                if (walk.getInt(j) != j + 1)
                    throw new IOException("Invalid eight-frame walk cycle");
            }
            for (String sleeper : STARTERS) {
                if (sleeper.equals(id) && (ww != 32 || wh != 56))
                    throw new IOException("Starter identity sprite mismatch");
            }
            String worldPath = w.getString("src");
            if (!worldPath.matches("assets/world/[A-Za-z0-9_-]+\\.png")
                    || !worldPaths.add(worldPath))
                throw new IOException("Unexpected or duplicate world art reference");
            png(root, worldPath, ww * 9, wh * 4);
            if (!w.getString("sha256").equalsIgnoreCase(sha256(required(root, worldPath))))
                throw new IOException("Approved world artwork checksum mismatch");

            int bw = b.getInt("frameWidth"), bh = b.getInt("frameHeight");
            if (b.getInt("columns") != 6 || b.getInt("rows") != 9
                    || (bw != 64 && bw != 96 && bw != 128) || bh != bw)
                throw new IOException("Invalid side-view sprite grid");
            String battlePath = b.getString("src");
            if (!battlePath.matches("assets/battlers/[A-Za-z0-9_-]+\\.png")
                    || !battlePaths.add(battlePath))
                throw new IOException("Unexpected or duplicate battle art reference");
            png(root, battlePath, bw * 6, bh * 9);
            if (!b.getString("sha256").equalsIgnoreCase(sha256(required(root, battlePath))))
                throw new IOException("Approved battle artwork checksum mismatch");
            requireAnimation(b);
        }
        for (String starter : STARTERS) {
            if (!ids.contains(starter)) throw new IOException("Missing starter identity");
            File portrait = required(root, "portraits/" + starter + ".png");
            BitmapFactory.Options bounds = new BitmapFactory.Options();
            bounds.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(portrait.getAbsolutePath(), bounds);
            if (bounds.outWidth < 1 || bounds.outHeight < 1)
                throw new IOException("Unreadable owner-approved portrait");
        }
        return maps.length();
    }

    static int install(Context context, Uri archiveUri) throws IOException {
        if (archiveUri == null || !"content".equals(archiveUri.getScheme()))
            throw new IOException("Select a trusted local ZIP via the Android document picker");
        File stage = new File(context.getFilesDir(), "owner-aeon-staging");
        File active = activeDirectory(context);
        File previous = new File(context.getFilesDir(), "owner-aeon-previous");
        removeTree(stage);
        if (!stage.mkdirs()) throw new IOException("Cannot prepare private asset storage");
        boolean installed = false;
        try {
            InputStream stream = context.getContentResolver().openInputStream(archiveUri);
            if (stream == null) throw new IOException("Cannot open selected archive");
            Set<String> seen = new HashSet<>();
            int entries = 0;
            long total = 0;
            byte[] buffer = new byte[16384];
            try (ZipInputStream zip = new ZipInputStream(new BufferedInputStream(stream))) {
                ZipEntry entry;
                while ((entry = zip.getNextEntry()) != null) {
                    if (++entries > MAX_ENTRIES)
                        throw new IOException("Archive contains too many files");
                    String name = relative(entry.getName());
                    boolean keep = !entry.isDirectory() && allowed(name);
                    if (keep && !seen.add(name))
                        throw new IOException("Duplicate private asset");
                    File dest = keep ? new File(stage, name) : null;
                    if (keep) {
                        String canonical = dest.getCanonicalPath();
                        if (!canonical.startsWith(stage.getCanonicalPath() + File.separator))
                            throw new IOException("Unsafe private asset path");
                        if (!dest.getParentFile().exists() && !dest.getParentFile().mkdirs())
                            throw new IOException("Cannot create asset directory");
                    }
                    long size = 0;
                    try (FileOutputStream out = keep ? new FileOutputStream(dest) : null) {
                        int n;
                        while ((n = zip.read(buffer)) != -1) {
                            total += n;
                            size += n;
                            if (total > MAX_UNPACKED || size > MAX_FILE)
                                throw new IOException("Archive exceeds private asset limits");
                            if (keep) out.write(buffer, 0, n);
                        }
                    }
                    zip.closeEntry(); // Checks ZIP CRC even for ignored executable files.
                }
            }
            // The owner phone package has exactly three JSON records, four
            // starter portraits and 42 pairs of original world/battle PNGs.
            // Reject partial or unexpected allowlisted inventories before
            // touching the currently installed private campaign.
            if (seen.size() != 91)
                throw new IOException("Incomplete owner content inventory");
            int mapCount = validate(stage);
            // Same filesystem rename: never erase a usable previous package
            // until every new source/PNG has been staged and validated.
            removeTree(previous);
            boolean hadPrevious = active.exists();
            if (hadPrevious && !active.renameTo(previous))
                throw new IOException("Could not protect previous private install");
            if (!stage.renameTo(active)) {
                if (hadPrevious && !previous.renameTo(active))
                    throw new IOException("Could not restore previous private install");
                throw new IOException("Cannot activate verified private content");
            }
            installed = true;
            try { removeTree(previous); }
            catch (IOException oldCleanupFailed) { /* New verified install is active. */ }
            return mapCount;
        } catch (JSONException badJson) {
            throw new IOException("Private source JSON validation failed", badJson);
        } finally {
            if (!installed) removeTree(stage);
        }
    }
}
