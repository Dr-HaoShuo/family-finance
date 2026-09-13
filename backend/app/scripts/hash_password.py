"""Run once to generate FAMILY_PASSWORD_HASH for backend/.env.

Usage (from backend/):
    python -m app.scripts.hash_password
"""

import getpass

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def main():
    password = getpass.getpass("Family password: ")
    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        print("Passwords did not match.")
        return
    print("\nAdd this line to backend/.env:\n")
    print(f"FAMILY_PASSWORD_HASH={pwd_context.hash(password)}")


if __name__ == "__main__":
    main()
