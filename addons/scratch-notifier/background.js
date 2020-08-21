import commentEmojis from "./comment-emojis.js";

export default async function ({ addon, global, console, setTimeout, setInterval, clearTimeout, clearInterval }) {
  let msgCount = null;
  let mostRecentMsgIds = [];
  const emojis = {
    addcomment: "💬",
    forumpost: "📚",
    loveproject: "❤️",
    favoriteproject: "⭐",
    followuser: "👤",
    curatorinvite: "✉️",
    remixproject: "🔄",
    studioactivity: "🆕",
  };

  checkCount();
  setInterval(checkCount, 6000);

  async function checkCount() {
    if (!addon.auth.isLoggedIn) return;
    const newCount = await addon.account.getMsgCount();
    console.log(newCount);
    if (newCount === null) return;
    if (msgCount !== newCount) {
      const oldMsgCount = msgCount;
      msgCount = newCount;
      if (msgCount !== oldMsgCount) checkMessages();
    }
  }

  function getMostRecentIds(messagesObj) {
    const arr = [];
    for (const message of messagesObj) {
      arr.push(message.id);
      // We only need a non-comment as a reference, since comments
      // are the only types of messages that could dissapear.
      if (message.type !== "addcomment") break;
    }
    return arr;
  }

  async function notifyMessage({
    emoji,
    messageType,
    actor,
    fragment,
    commentee,
    commentUrl,
    title,
    element_id,
    parent_title,
  }) {
    let text = "";
    let url;
    if (emoji) text += `${emoji} `;
    if (messageType.startsWith("addcomment/")) {
      url = commentUrl;
      if (title.length > 20) title = `${title.substring(0, 17).trimEnd()}...`;
      if (messageType === "addcomment/ownProjectNewComment") {
        text += `${actor} commented in your project "${title}":\n${fragment}`;
      } else if (messageType === "addcomment/projectReplyToSelf") {
        text += `${actor} replied to you in project "${title}":\n${fragment}`;
      } else if (messageType === "addcomment/ownProjectReplyToOther") {
        text += `${actor} replied to ${commentee} in project "${title}":\n${fragment}`;
      } else if (messageType === "addcomment/ownProfileNewComment") {
        text += `${actor} commented in your profile:\n${fragment}`;
      } else if (messageType === "addcomment/ownProfileReplyToSelf") {
        text += `${actor} replied to you in your profile:\n${fragment}`;
      } else if (messageType === "addcomment/ownProfileReplyToOther") {
        text += `${actor} replied to ${commentee} in your profile:\n${fragment}`;
      } else if (messageType === "addcomment/otherProfileReplyToSelf") {
        text += `${actor} replied in ${title}'s profile:\n${fragment}`;
      } else if (messageType === "addcomment/studio") {
        text += `${actor} replied in studio "${title}":\n${fragment}`;
      }
    } else if (messageType === "forumpost") {
      text += `There are new posts in the forum thread "${title}"`;
      url = `https://scratch.mit.edu/discuss/topic/${element_id}/unread/`;
    } else if (messageType === "loveproject") {
      text += `${actor} loved your project "${title}"`;
      url = `https://scratch.mit.edu/users/${actor}/`;
    } else if (messageType === "favoriteproject") {
      text += `${actor} favorited your project "${title}"`;
      url = `https://scratch.mit.edu/users/${actor}/`;
    } else if (messageType === "followuser") {
      text += `${actor} is now following you`;
      url = `https://scratch.mit.edu/users/${actor}/`;
    } else if (messageType === "curatorinvite") {
      text += `${actor} invited you to curate the studio "${title}"`;
      url = `https://scratch.mit.edu/studios/${element_id}/curators/`;
    } else if (messageType === "remixproject") {
      text += `${actor} remixed your project "${parent_title}" as "${title}"`;
      url = `https://scratch.mit.edu/projects/${element_id}/`;
    } else if (messageType === "studioactivity") {
      text += `There was new activity in studio "${title}" today`;
    }
    const notifId = await addon.notifications.create({
      type: "basic",
      title: "New Scratch message",
      iconUrl: "/images/icon.png",
      message: text,
      buttons: [
        {
          title: "Open messages page",
        },
        {
          title: "Mark all as read",
        },
      ],
    });
    const onClick = (e) => {
      if (e.detail.id === notifId) {
        addon.browserTabs.create({ url });
        addon.notifications.clear(notifId);
        markAsRead();
      }
    };
    const onButtonClick = (e) => {
      if (e.detail.id === notifId) {
        if (e.detail.buttonIndex === 0) openMessagesPage();
        else markAsRead();
        addon.notifications.clear(notifId);
      }
    };
    addon.notifications.addEventListener("click", onClick);
    addon.notifications.addEventListener("buttonclick", onButtonClick);
    addon.notifications.addEventListener(
      "close",
      (e) => {
        if (e.detail.id === notifId) {
          addon.notifications.removeEventListener("click", onClick);
          addon.notifications.removeEventListener("buttonclicked", onButtonClick);
        }
      },
      { once: true }
    );
  }

  async function openMessagesPage() {
    const tabs = await addon.browserTabs.query({
      url: "https://scratch.mit.edu/messages*",
    });
    if (tabs[0]) {
      addon.browserWindows.update(tabs[0].windowId, {
        focused: true,
      });
      addon.browserTabs.update(tabs[0].id, {
        active: true,
        url: "https://scratch.mit.edu/messages/",
      });
    } else {
      addon.browserTabs.create({
        url: "https://scratch.mit.edu/messages/",
      });
    }
    msgCount = 0;
  }

  function markAsRead() {
    addon.fetch("https://scratch.mit.edu/site-api/messages/messages-clear/", {
      method: "POST",
    });
    msgCount = 0;
  }

  async function checkMessages() {
    const res = await addon.fetch(
      `https://api.scratch.mit.edu/users/${addon.auth.username}/messages?limit=40&offset=0&timestamp=${Date.now()}`
    );
    const messages = await res.json();
    if (mostRecentMsgIds.length === 0) mostRecentMsgIds = getMostRecentIds(messages);
    else if (messages[0].id !== mostRecentMsgIds[0]) {
      for (const message of messages) {
        if (mostRecentMsgIds.includes(message.id)) break;
        let messageType = message.type;
        let commentUrl;
        if (message.type === "addcomment") {
          messageType += "/";
          if (message.comment_type === 0) {
            // Project comment
            const replyFor = message.commentee_username;
            if (replyFor === null) messageType += "ownProjectNewComment";
            else if (replyFor === addon.auth.username) messageType += "projectReplyToSelf";
            else messageType += "ownProjectReplyToOther";
            commentUrl = `https://scratch.mit.edu/projects/${message.comment_obj_id}/#comments-${message.comment_id}`;
          } else if (message.comment_type === 1) {
            const profile = message.comment_obj_title;
            const replyFor = message.commentee_username;
            if (profile === addon.auth.username) {
              if (replyFor === null) messageType += "ownProfileNewComment";
              else if (replyFor === addon.auth.username) messageType += "ownProfileReplyToSelf";
              else messageType += "ownProfileReplyToOther";
            } else {
              messageType += "otherProfileReplyToSelf";
            }
            commentUrl = `https://scratch.mit.edu/users/${message.comment_obj_title}/#comments-${message.comment_id}`;
          } else if (message.comment_type === 2) {
            messageType = "studio";
            commentUrl = `https://scratch.mit.edu/studios/${message.comment_obj_id}/comments/#comments-${message.comment_id}`;
          }
        }

        // Return if this notification type is muted
        if (message.type === "addcomment") {
          if (
            messageType === "addcomment/ownProjectNewComment" ||
            messageType === "addcomment/ownProjectReplyToOther"
          ) {
            if (addon.settings.get("commentsonmyprojects_notifications") === false) return;
          } else {
            if (addon.settings.get("commentsforme_notifications") === false) return;
          }
        } else {
          try {
            if (addon.settings.get(`${message.type}_notifications`) === false) return;
          } catch {
            // If setting doesn't exist
            console.warn(`Unexpected message type: ${message.type}`);
            return;
          }
        }

        const messageInfo = {
          emoji: emojis[message.type],
          messageType,
          actor: message.actor_username,
          fragment: htmlToText(message.comment_fragment), // Comments only
          commentee: message.commentee_username, // Comments only
          commentUrl, // Comments only
          title: htmlToText(message.comment_obj_title || message.topic_title || message.title || message.project_title),
          element_id: message.comment_id || message.gallery_id || message.project_id,
          parent_title: htmlToText(message.parent_title), // Remixes only
        };
        notifyMessage(messageInfo);
      }
      mostRecentMsgIds = getMostRecentIds(messages);
    }
  }

  function htmlToText(html) {
    if (html === undefined) return;
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    let value = txt.value;
    const matches = value.match(/<img([\w\W]+?)[\/]?>/g);
    if (matches) {
      for (const match of matches) {
        const src = match.match(/\<img.+src\=(?:\"|\')(.+?)(?:\"|\')(?:.+?)\>/)[1];
        const splitString = src.split("/");
        const imageName = splitString[splitString.length - 1];
        if (commentEmojis[imageName]) {
          value = value.replace(match, commentEmojis[imageName]);
        }
      }
    }
    value = value.replace(/<[^>]*>?/gm, ""); // Remove remaining HTML tags
    value = value.replace(/\n/g, " ").trim(); // Remove newlines
    if (html.length === 250) value += "..."; // Add ellipsis if shortened
    return value;
  }

  addon.auth.addEventListener("change", function () {
    msgCount = null;
    mostRecentMsgIds = [];
    checkCount();
  });
}
