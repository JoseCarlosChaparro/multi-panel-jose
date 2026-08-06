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
        // The base class never exposes the handler id, so capture it by
        // intercepting connect() for the duration of the parent constructor.
        const sessionMode = Main.sessionMode;
        const realConnect = sessionMode.connect.bind(sessionMode);
        const capturedIds = [];
        sessionMode.connect = (signal, callback) => {
            const id = realConnect(signal, callback);
            capturedIds.push(id);
            return id;
        };
        try {
            super._init();
        } finally {
            sessionMode.connect = realConnect;
        }

        this.connect('destroy', () => {
            for (const id of capturedIds)
                sessionMode.disconnect(id);
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
