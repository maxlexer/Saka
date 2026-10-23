-- The customer Telegram deep link is gone, so the token that keyed it is too.
alter table orders drop column if exists claim_token;
