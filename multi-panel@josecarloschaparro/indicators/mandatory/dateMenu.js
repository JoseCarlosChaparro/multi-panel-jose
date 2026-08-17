/*
Copyright (C) 2014  spin83
Copyright (C) 2026  inasis

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

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as DateMenu from 'resource:///org/gnome/shell/ui/dateMenu.js';

const NativeAuxiliaryDateMenuButton = class NativeAuxiliaryDateMenuButton extends DateMenu.DateMenuButton {
    _init() {
        // DateMenuButton._init() connects to sessionMode 'updated' with a plain
        // connect() and never disconnects it. The shell's own date menu is
        // never destroyed, so the leak is invisible upstream, but auxiliary
        // panels are torn down on monitor changes and panel rebuilds. The stale
        // handler then runs _sessionUpdated() against a disposed actor when the
        // screen locks, throwing "can't access property attach, layout is null"
        // out of Calendar._rebuildCalendar().
        //
        // The same class of leak exists for Main.messageTray: the embedded
        // MessagesIndicator connects to it with plain connect() and never
        // disconnects, so a destroyed auxiliary date menu keeps receiving
        // notification callbacks and crashes on its cleared _settings
        // ("can't access property get_boolean, this._settings is null").
        //
        // The base class never exposes the handler ids, so capture them by
        // intercepting connect() on both emitters for the duration of the
        // parent constructor.
        const leakyEmitters = [Main.sessionMode, Main.messageTray].filter(Boolean);
        const captured = [];
        const realConnects = new Map();
        for (const emitter of leakyEmitters) {
            const realConnect = emitter.connect.bind(emitter);
            realConnects.set(emitter, realConnect);
            emitter.connect = (signal, callback) => {
                const id = realConnect(signal, callback);
                captured.push({ emitter, id });
                return id;
            };
        }
        try {
            super._init();
        } finally {
            for (const emitter of leakyEmitters)
                emitter.connect = realConnects.get(emitter);
        }

        this.connect('destroy', () => {
            for (const { emitter, id } of captured) {
                if (GObject.signal_handler_is_connected(emitter, id))
                    emitter.disconnect(id);
            }
        });

        const mainButton = Main.panel.statusArea?.dateMenu ?? null;
        if (mainButton) {
            const buttonClass = mainButton.get_style_class_name?.();
            if (buttonClass)
                this.set_style_class_name(buttonClass);

            const menuClass = mainButton.menu?.box?.get_style_class_name?.();
            if (menuClass)
                this.menu?.box?.set_style_class_name?.(menuClass);
        }

        this.visible = true;
        this.show();
    }
};

export const AuxiliaryDateMenuButton = GObject.registerClass(NativeAuxiliaryDateMenuButton);
