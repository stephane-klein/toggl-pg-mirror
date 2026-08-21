-- Allow users without any password or OIDC credential: they sign in via the
-- magic link or reset their password. Removes the constraint that required at
-- least one authentication method.
ALTER TABLE users DROP CONSTRAINT at_least_one_auth;