document.addEventListener("DOMContentLoaded", function () {
    let ws = new WebSocket(APP.chat_ws_url);
    let room = null;
    let messageHoverEl = null;
    let userHover = null;
    let scrollEl = document.getElementById('chat-scroller');

    messagePush("Connecting to SneedChat...");

    ws.addEventListener('close', function (event) {
        messagePush("Connection closed by remote server.");
    });

    ws.addEventListener('error', function (event) {
        console.log(event);
    });

    ws.addEventListener('message', function (event) {
        let author = null;
        let id = null;
        let message = null;

        // Try to parse JSON data.
        try {
            let json = JSON.parse(event.data);
            author = json.author;
            message = json.message;
            id = json.message_id;
        }
        // Not valid JSON, default
        catch (error) {
            message = event.data;
        }
        // Push whatever we got to chat.
        finally {
            messagePush(message, author, id);
        }
    });

    ws.addEventListener('open', function (event) {
        if (room === null) {
            if (!roomJoinByHash()) {
                messagePush("Connected! You may now join a room.");
            }
            else {
                messagePush("Connected!");
            }
        }
        else {
            messagePush(`Connected to <em>${room.title}</em>!`);
        }
    });

    function messageAddEventListeners(element) {
        if (Object.keys(element.dataset).indexOf('author') > -1) {
            element.addEventListener('mouseenter', messageMouseEnter);
            element.addEventListener('mouseleave', messageMouseLeave);
        }

        let authorEl = element.querySelector('.author');
        if (authorEl !== null) {
            authorEl.addEventListener('click', usernameClick);
        }

        Array.from(element.querySelectorAll('.username')).forEach(function (usernameEl) {
            usernameEl.addEventListener('click', usernameClick);
            usernameEl.addEventListener('mouseenter', usernameEnter);
            usernameEl.addEventListener('mouseleave', usernameLeave);
        });
    }

    function messageMouseEnter(event) {
        var author = parseInt(this.dataset.author, 10);

        // Are we already hovering over something?
        if (messageHoverEl !== null) {
            // Is it the same message?
            if (this == messageHoverEl) {
                // We don't need to do anything.
                return true;
            }

            // Is it by the same author?
            if (author === parseInt(messageHoverEl.dataset.author, 10)) {
                // Great, we don't need to do anything.
                //messageHoverEl = $msg;
                //chat.$msgs.children().removeClass(chat.classes.highlightHover);
                //$msg.addClass(chat.classes.highlightHover);
                return true;
            }
        }

        messageHoverEl = this;

        Array.from(document.querySelectorAll('.chat-message--highlightAuthor')).forEach(function (el) {
            el.classList.remove('chat-message--highlightAuthor');
        });

        Array.from(document.querySelectorAll(`.chat-message[data-author='${author}']`)).forEach(function (el) {
            el.classList.add('chat-message--highlightAuthor');
        });
    }

    function messageMouseLeave(event) {
        // We only need to do anything if we're hovering over this message.
        // If we moved between messages, this work is already done.
        if (messageHoverEl !== null && messageHoverEl == this) {
            // We are off of any message, so remove the hovering classes.
            messageHoverEl = null;
            Array.from(document.querySelectorAll('.chat-message--highlightAuthor')).forEach(function (el) {
                el.classList.remove('chat-message--highlightAuthor');
            });
        }
    }

    function messagePush(message, author, id) {
        let messages = document.getElementById('chat-messages');
        let template = document.getElementById('tmp-chat-message').content.cloneNode(true);
        let timeNow = new Date();

        template.querySelector('.message').innerHTML = message;
        template.children[0].dataset.received = timeNow.getTime();

        // Set the relative timestamp
        let timestamp = template.querySelector('time');
        timestamp.setAttribute('datetime', timeNow.toISOString());
        timestamp.innerHTML = "Just now";

        if (typeof author === 'object' && author !== null) {
            template.children[0].id = `chat-message-${id}`;
            template.children[0].dataset.author = author.id;

            // Ignored poster?
            if (APP.user.ignored_users.includes(author.id)) {
                template.children[0].classList.add("chat-message--isIgnored");
            }

            // Group consequtive messages by the same author.
            let lastChild = messages.lastElementChild;
            if (lastChild !== null && lastChild.dataset.author == author.id) {
                // Allow to break into new groups if too much time has passed.
                let timeLast = new Date(parseInt(lastChild.dataset.received, 10));
                if (timeNow.getTime() - timeLast.getTime() < 30000) {
                    template.children[0].classList.add("chat-message--hasParent");
                }
            }

            // Add meta details
            let authorEl = template.querySelector('.author');
            authorEl.innerHTML = author.username;
            authorEl.dataset.id = author.id;

            // Add left-content details
            if (author.avatar_date > 0) {
                template.querySelector('.avatar').setAttribute('src', `/data/avatars/m/${Math.floor(author.id / 1000)}/${author.id}.jpg?${author.avatar_date}`);
            }
            else {
                template.querySelector('.avatar').remove();
            }

            // Add right-content details
            template.querySelector('.report').setAttribute('href', `/chat/messages/${id}/report`);
        }
        else {
            template.querySelector('.meta').remove();
            template.querySelector('.left-content').remove();
            //template.querySelector('.right-content').remove();
        }

        // Check tagging.
        if (message.includes(`@${APP.user.username}`)) {
            template.children[0].classList.add("chat-message--highlightYou");
        }

        let el = messages.appendChild(template.children[0]);
        messageAddEventListeners(el);

        // Prune oldest messages.
        while (messages.children.length > 200) {
            messages.children[0].remove();
        }

        messages.children[0].classList.remove("chat-message--hasParent");

        // Scroll down.
        scrollToNew();

        return el;
    }

    function messageSend(message) {
        ws.send(message);
    }

    function messagesDelete() {
        let messagesEl = document.getElementById('chat-messages');
        while (messagesEl.firstChild) {
            messagesEl.removeChild(messagesEl.firstChild);
        }
    }

    function roomJoin(id) {
        if (Number.isInteger(id) && id > 0) {
            messagesDelete();
            messageSend(`/join ${id}`);
            scrollEl.classList.add('ScrollLocked'); // lock chat so autoscroll starts again.
            return true;
        }

        console.log(`Attempted to join a room with an ID of ${room_id}`);
        return false;
    }

    function roomJoinByHash() {
        let room_id = parseInt(window.location.hash.substring(1), 10);

        if (room_id > 0) {
            return roomJoin(room_id);
        }

        return false;
    }

    function scrollerScroll(event) {
        this._focused = true;

        // if last scrollTop is lower (greater) than current scroll top,
        // we have scrolled down.
        if (this.lastScrollPos > this.scrollTop) {
            this.classList.remove('ScrollLocked');
        }
        // if we've scrolled down and we are very close to the bottom
        // based on the height of the viewport, lock it in
        else {
            const clampHeight = 32; // margin of error

            if (this.offsetHeight + this.scrollTop >= this.scrollHeight - clampHeight) {
                this.classList.add('ScrollLocked');
            }
        }

        this.lastScrollPos = this.scrollTop;
    }

    function scrollToNew() {
        let scroller = document.getElementById('chat-scroller');

        if (scroller.classList.contains('ScrollLocked')) {
            scroller.scrollTo(0, scroller.scrollHeight);
        }
    }

    function usernameClick(event) {
        // TODO: Replace with Dialog like Discord?
        let input = document.getElementById('chat-input')
        input.value += `@${this.textContent}, `;
        input.setSelectionRange(input.value.length, input.value.length);
        input.focus();

        event.preventDefault();
        return false;
    }

    function usernameEnter(event) {
        var id = parseInt(this.dataset.id, 10);

        if (userHover === id) {
            return true;
        }

        userHover = id;

        Array.from(document.querySelectorAll('.chat-message--highlightUser')).forEach(function (el) {
            el.classList.remove('chat-message--highlightUser');
        });
        Array.from(document.querySelectorAll(`[data-author='${id}']`)).forEach(function (el) {
            el.classList.add('chat-message--highlightUser');
        });
    }

    function usernameLeave(event) {
        var id = parseInt(this.dataset.id, 10);

        // Are we hovering over the same message still?
        // This stops unhovering when moving between hover targets.
        if (userHover === id) {
            userHover = null;
            Array.from(document.querySelectorAll('.chat-message--highlightUser')).forEach(function (el) {
                el.classList.remove('chat-message--highlightUser');
            });
        }
    }


    // Room buttons
    //document.getElementById('chat-rooms').addEventListener('click', function (event) {
    //    let target = event.target;
    //    if (target.classList.contains('chat-room')) {
    //        let room_id = parseInt(target.dataset.id, 10);
    //
    //        if (!isNaN(room_id) && room_id > 0) {
    //            messageSend(`/join ${room_id}`);
    //        }
    //        else {
    //            console.log(`Attempted to join a room with an ID of ${room_id}`);
    //        }
    //    }
    //});

    // Scroll window
    scrollEl.addEventListener('scroll', scrollerScroll);
    scrollEl.classList.add('ScrollLocked');

    // Form
    document.getElementById('chat-input').addEventListener('keydown', function (event) {
        if (event.key === "Enter") {
            event.preventDefault();

            //let formData = new FormData(this.parentElement);
            //let formProps = Object.fromEntries(formData);
            //
            //messageSend(JSON.stringify(formProps));
            messageSend(this.value);

            this.value = "";
            return false;
        }
    });

    window.addEventListener('hashchange', roomJoinByHash, false);
});
