//! Rete — casca nativa. A interface é web (React); aqui ficam as partes do sistema:
//! bandeja, iniciar com o sistema, instância única, links profundos (login) e plugins.

#[cfg(desktop)]
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};

#[cfg(desktop)]
fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default();

    // Abrir o app de novo (ou um link rete://) só traz a janela existente pra frente
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| show_main(app)));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(tauri_plugin_autostart::init(
                    tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                    Some(vec!["--hidden"]),
                ))?;

                #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
                {
                    use tauri_plugin_deep_link::DeepLinkExt;
                    let _ = app.deep_link().register_all();
                }

                // Bandeja: o Rete continua vivo depois de fechar a janela, para os lembretes tocarem
                let show = MenuItem::with_id(app, "show", "Abrir o Rete", true, None::<&str>)?;
                let quit = MenuItem::with_id(app, "quit", "Sair de vez", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&show, &quit])?;
                TrayIconBuilder::with_id("rete")
                    .icon(app.default_window_icon().unwrap().clone())
                    .tooltip("Rete")
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, e| match e.id.as_ref() {
                        "show" => show_main(app),
                        "quit" => app.exit(0),
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, e| {
                        if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = e {
                            show_main(tray.app_handle());
                        }
                    })
                    .build(app)?;

                // Iniciado com o sistema: começa escondido na bandeja
                if std::env::args().any(|a| a == "--hidden") {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.hide();
                    }
                }
            }
            Ok(())
        })
        .on_window_event(|_w, _e| {
            // Fechar a janela só esconde (no desktop); "Sair de vez" fica na bandeja
            #[cfg(desktop)]
            if let WindowEvent::CloseRequested { api, .. } = _e {
                let _ = _w.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Rete");
}
