// One look for the whole desktop: org.neru.desktop (opacity, blur, blur-strength; neru-desktop-defaults installs it)
// is copied, when it changes, to what Isle's glass, the dock and the app windows (Blur my Shell) read. Without the
// schema (the package isn't installed) nothing happens.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const EXTENSION_DIRS = [GLib.get_user_data_dir(), '/usr/local/share', '/usr/share'].map(base => `${base}/gnome-shell/extensions`);

/** Settings of another extension, read from the schemas folder it ships; null when it isn't there. */
function extensionSettings(uuid, schemaId) {
    for (const base of EXTENSION_DIRS) {
        try {
            const source = Gio.SettingsSchemaSource.new_from_directory(
                `${base}/${uuid}/schemas`,
                Gio.SettingsSchemaSource.get_default(), false);
            const schema = source.lookup(schemaId, false);
            if (schema)
                return new Gio.Settings({settings_schema: schema});
        } catch (_e) {
            // not in this place
        }
    }
    return null;
}

export class NeruSync {
    constructor(isleSettings) {
        this._isle = isleSettings;
        const source = Gio.SettingsSchemaSource.get_default();
        if (!source?.lookup('org.neru.desktop', true))
            return;
        this._shared = new Gio.Settings({schema_id: 'org.neru.desktop'});
        this._dock = extensionSettings('macos-dock@vinnytherobot.github.io', 'org.gnome.shell.extensions.macosdock');
        this._apps = extensionSettings('blur-my-shell@aunetx', 'org.gnome.shell.extensions.blur-my-shell.applications');
        this._id = this._shared.connect('changed', () => this._apply());
    }

    _apply() {
        const opacity = this._shared.get_int('opacity');
        const blur = this._shared.get_boolean('blur');
        const strength = this._shared.get_int('blur-strength');
        this._isle.set_int('glass-tint', opacity);
        if (this._dock) {
            this._dock.set_int('dock-opacity', opacity);
            this._dock.set_boolean('dock-blur-enabled', blur);
        }
        if (this._apps) {
            this._apps.set_int('opacity', Math.round(opacity * 2.55));
            this._apps.set_boolean('blur', blur);
            this._apps.set_int('sigma', strength);
        }
    }

    destroy() {
        if (this._id)
            this._shared.disconnect(this._id);
        this._id = 0;
    }
}
