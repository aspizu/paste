import {Page} from "./page"

export function LoginPage({next, error}: {next: string; error?: string}) {
  return (
    <Page title="Log in">
      {error && <p role="alert">{error}</p>}
      <form method="post" action="/login">
        <input type="hidden" name="next" value={next} />
        <p>
          <label for="totp">Authenticator code</label>
        </p>
        <p>
          <input
            id="totp"
            name="totp"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            pattern="[0-9]{6}"
            minlength={6}
            maxlength={6}
            required
            autofocus
          />
        </p>
        <button type="submit">Log in</button>
      </form>
    </Page>
  )
}
