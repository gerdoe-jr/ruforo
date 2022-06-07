pub mod connection;
pub mod message;
pub mod server;

use crate::compat::xf::orm::chat_room;
use crate::compat::xf::session::get_user_from_request;
use actix::Addr;
use actix_web::http::header;
use actix_web::{error, get, web, web::Data, Error, HttpRequest, HttpResponse, Responder};
use actix_web_actors::ws;
use askama_actix::Template;
use sea_orm::DatabaseConnection;
use std::time::{Duration, Instant};

/// How often heartbeat pings are sent
pub const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
/// How long before lack of client response causes a timeout
pub const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);

/// Entry point for our websocket route
pub async fn service(req: HttpRequest, stream: web::Payload) -> Result<HttpResponse, Error> {
    let db = req
        .app_data::<Data<DatabaseConnection>>()
        .expect("No database connection.");
    let session = get_user_from_request(db, &req).await;

    ws::start(
        connection::Connection {
            id: usize::MIN, // mutated by server
            session,
            hb: Instant::now(),
            room: None,
            addr: req
                .app_data::<Addr<server::ChatServer>>()
                .expect("No chat server.")
                .clone(),
            last_command: Instant::now(),
        },
        &req,
        stream,
    )
}

#[derive(Template)]
#[template(path = "chat.html")]
struct ChatTestTemplate {
    rooms: Vec<chat_room::Model>,
    app_json: String,
}

#[get("/test-chat")]
pub async fn view_chat(req: HttpRequest) -> impl Responder {
    use crate::compat::xf::room::get_room_list;

    let db = req
        .app_data::<Data<DatabaseConnection>>()
        .expect("No database connection.");
    let session = get_user_from_request(db, &req).await;

    ChatTestTemplate {
        rooms: get_room_list(db).await,
        app_json: format!(
            "{{
                chat_ws_url: \"{}\",
                user: {},
            }}",
            std::env::var("XF_WS_URL").expect("XF_WS_URL needs to be set in .env"),
            serde_json::to_string(&session).expect("XfSession stringify failed"),
        ),
    }
}
