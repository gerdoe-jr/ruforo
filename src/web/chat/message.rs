use crate::compat::xf::session::{XfAuthor, XfSession};
use actix::prelude::*;
use serde::Serialize;

// Note: There is ambiguous referencing to 'id'.
// An usize id represents the connection actor addr.
// An u32 id is pulled from the db and is a user id.

/// Send message to specific room
#[derive(Serialize)]
pub struct ClientMessage {
    /// Conn Id
    pub id: usize,
    /// Author Session
    pub author: XfAuthor,
    /// Recipient room
    pub room_id: usize,
    /// Message ID from database
    pub message_id: u32,
    /// Peer message
    pub message: String,
}

impl Message for ClientMessage {
    type Result = ();
}

/// New chat session is created
#[derive(Message)]
#[rtype(usize)]
pub struct Connect {
    pub addr: Recipient<ServerMessage>,
}

/// Session is disconnected
#[derive(Message)]
#[rtype(result = "()")]
pub struct Disconnect {
    /// Conn Id
    pub id: usize,
}

/// Join room, if room does not exists create new one.
#[derive(Message)]
#[rtype(result = "()")]
pub struct Join {
    /// Conn Id
    pub id: usize,
    /// Room Id
    pub room_id: usize,
    /// Author Session
    pub author: XfSession,
}

/// List of available rooms
pub struct ListRooms;

impl actix::Message for ListRooms {
    type Result = Vec<usize>;
}

/// Message from server to clients
#[derive(Message)]
#[rtype(result = "()")]
pub struct ServerMessage(pub String);

/// Message from server to clients
#[derive(Message)]
#[rtype(result = "()")]
pub struct RoomMessage {
    pub room_id: usize,
    pub message: String,
}
