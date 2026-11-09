/*
This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, visit https://www.gnu.org/licenses/.
*/

import GObject from 'gi://GObject';

/**
 * Disconnect a handler from either a GObject or a JS Signals.EventEmitter.
 *
 * Main.sessionMode and Main.overview are plain JS emitters, not GObjects:
 * GObject.signal_handler_is_connected() throws a TypeError on them, which
 * used to abort cleanup loops and leak their handlers. GObjects keep the id
 * check because disconnecting a stale id only logs a GLib warning.
 *
 * @param {object|null} emitter - the object the handler was connected to
 * @param {number|null} handlerId - the id returned by connect()
 */
export function disconnectSafely(emitter, handlerId) {
    if (!emitter || !handlerId)
        return;

    try {
        if (!(emitter instanceof GObject.Object)) {
            emitter.disconnect(handlerId);
            return;
        }

        if (GObject.signal_handler_is_connected(emitter, handlerId))
            emitter.disconnect(handlerId);
    } catch (_e) {
        // The emitter is already disposed or the id is gone: nothing to undo.
    }
}
