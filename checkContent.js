const axios = require("axios");
const FormData = require("form-data");

exports.handler = async function (context, event, callback) {
  // The pre-initialized Twilio client is available from the `context` object
  const twilioClient = context.getTwilioClient();

  // Query parameters or values sent in a POST body can be accessed from `event`
  const from = event.From;
  const to = event.To;
  const body = event.Body;

  try {
    const profanity = await checkContent(body, context);
    if (!profanity) {
      const message = await sendSMS(from, to, body);
      return callback(null, `Success! Message SID: ${message.sid}`);
    } else {
      return callback(null, `Profanity found, no message was sent`);
    }
  } catch (e) {
    return callback(e);
  }
};

const checkContent = async (msg, context) => {
  const data = new FormData();
  data.append("text", msg);
  data.append("lang", "en");
  data.append("models", "general");
  data.append("mode", "ml");
  data.append("api_user", context.SIGHT_ENGINE_API_USER);
  data.append("api_secret", context.SIGHT_ENGINE_API_SECRET);

  const threshold = 0.5; // choose an appropriate threshhold

  let url = "https://api.sightengine.com/1.0/text/check.json";
  try {
    const res = await axios.post(url, data);
    let available_classes = res.data.moderation_classes.available;
    const profanity = [];
    for (var i = 0; i < available_classes.length; i++) {
      if (res.data.moderation_classes[available_classes[i]] > 0.5) {
        // If greater than threshold add to profanity array
        profanity.push(available_classes[i]);
      }
    }
    if (profanity.length > 0) {
      // Do not send message
      console.log(profanity, "profanity found - reject sms");
      return true;
    } else {
      // Send SMS when no profanity detected
      console.log("no profanity found - send SMS");
      return false;
    }
  } catch (e) {
    console.log(e);
  }
};

const sendSMS = async (from, to, body) => {
  const message = await twilioClient.messages.create({
    from: from,
    to: to,
    body: body,
  });
  return message;
};
