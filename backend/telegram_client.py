"""
Telegram client using Telethon for fetching messages from trading channels
"""
import os
from typing import List, Dict, Optional, AsyncGenerator
from datetime import datetime, timedelta
from telethon import TelegramClient, events
from telethon.tl.types import Message, MessageMediaPhoto, MessageMediaDocument
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Telegram API credentials
API_ID = int(os.getenv('TELEGRAM_API_ID', 0))
API_HASH = os.getenv('TELEGRAM_API_HASH', '')
PHONE_NUMBER = os.getenv('PHONE_NUMBER', '')
SESSION_NAME = os.getenv('SESSION_NAME', 'telegram_session')

# Client instance
client: Optional[TelegramClient] = None


async def init_client() -> TelegramClient:
    """
    Initialize and connect to Telegram client

    Returns:
        TelegramClient instance

    Raises:
        ValueError: If API credentials are missing
    """
    global client

    if not API_ID or not API_HASH:
        raise ValueError(
            "Missing Telegram API credentials. Please set TELEGRAM_API_ID and TELEGRAM_API_HASH in .env file.\n"
            "Get credentials from https://my.telegram.org"
        )

    if not PHONE_NUMBER:
        raise ValueError(
            "Missing PHONE_NUMBER in .env file. This is required for first-time authentication."
        )

    if client is None or not client.is_connected:
        client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
        await client.connect()

        # Check if authorized
        if not await client.is_user_authorized():
            await client.send_code_request(PHONE_NUMBER)
            print(f"Verification code sent to {PHONE_NUMBER}")
            code = input("Please enter the verification code: ")
            try:
                await client.sign_in(PHONE_NUMBER, code)
                print("Successfully logged in to Telegram!")
            except Exception as e:
                print(f"Login failed: {e}")
                raise

    return client


async def disconnect_client():
    """Disconnect from Telegram"""
    global client
    if client and client.is_connected:
        await client.disconnect()
        client = None


async def get_channel_by_username(username: str) -> Optional[Dict]:
    """
    Get channel information by username

    Args:
        username: Channel username (with or without @ symbol)

    Returns:
        Dictionary with channel info or None if not found
    """
    try:
        cli = await init_client()

        # Remove @ if present
        clean_username = username.lstrip('@')
        entity = await cli.get_entity(clean_username)

        return {
            'id': entity.id,
            'title': getattr(entity, 'title', getattr(entity, 'first_name', '')),
            'username': getattr(entity, 'username', ''),
            'type': 'channel' if hasattr(entity, 'megagroup') else 'chat'
        }
    except Exception as e:
        print(f"Error fetching channel {username}: {e}")
        return None


async def fetch_messages(
    channel_username: str,
    limit: int = 100,
    offset_date: Optional[datetime] = None
) -> List[Dict]:
    """
    Fetch messages from a Telegram channel

    Args:
        channel_username: Channel username (with or without @)
        limit: Maximum number of messages to fetch
        offset_date: Fetch messages from this date onwards

    Returns:
        List of message dictionaries
    """
    try:
        cli = await init_client()

        # Remove @ if present
        clean_username = channel_username.lstrip('@')

        messages_data = []

        async for message in cli.iter_messages(
            clean_username,
            limit=limit,
            offset_date=offset_date
        ):
            if not message.text:
                continue  # Skip messages without text

            msg_dict = {
                'id': message.id,
                'text': message.text,
                'date': message.date,
                'sender_id': message.sender_id,
                'has_media': message.media is not None,
                'media_type': None
            }

            if message.media:
                if isinstance(message.media, MessageMediaPhoto):
                    msg_dict['media_type'] = 'photo'
                elif isinstance(message.media, MessageMediaDocument):
                    msg_dict['media_type'] = 'document'

            messages_data.append(msg_dict)

        return messages_data

    except Exception as e:
        print(f"Error fetching messages from {channel_username}: {e}")
        return []


async def fetch_messages_async(
    channel_username: str,
    limit: int = 100,
    offset_date: Optional[datetime] = None
) -> AsyncGenerator[Dict, None]:
    """
    Async generator for streaming messages from Telegram

    Args:
        channel_username: Channel username
        limit: Maximum number of messages
        offset_date: Fetch messages from this date onwards

    Yields:
        Message dictionaries one by one
    """
    try:
        cli = await init_client()
        clean_username = channel_username.lstrip('@')

        count = 0
        async for message in cli.iter_messages(
            clean_username,
            limit=limit,
            offset_date=offset_date
        ):
            if count >= limit:
                break

            if not message.text:
                continue

            yield {
                'id': message.id,
                'text': message.text,
                'date': message.date,
                'sender_id': message.sender_id,
                'has_media': message.media is not None,
                'media_type': None
            }

            count += 1

    except Exception as e:
        print(f"Error in async message fetch: {e}")


async def subscribe_to_channel(channel_username: str, callback):
    """
    Subscribe to live updates from a channel

    Args:
        channel_username: Channel username to subscribe to
        callback: Async function to call when new message arrives
    """
    try:
        cli = await init_client()
        clean_username = channel_username.lstrip('@')

        @cli.on(events.NewMessage(chats=clean_username))
        async def handler(event):
            message = event.message
            if message.text:
                await callback({
                    'id': message.id,
                    'text': message.text,
                    'date': message.date,
                    'sender_id': message.sender_id,
                    'has_media': message.media is not None
                })

        print(f"Subscribed to channel: {channel_username}")
        await cli.run_until_disconnected()

    except Exception as e:
        print(f"Error subscribing to channel: {e}")


async def get_user_channels() -> List[Dict]:
    """
    Get all channels the user is a member of

    Returns:
        List of channel dictionaries
    """
    try:
        cli = await init_client()
        channels = []

        async for dialog in cli.iter_dialogs():
            # Only include channels and supergroups
            if dialog.is_channel or dialog.is_group:
                channels.append({
                    'id': dialog.entity.id,
                    'title': dialog.name,
                    'username': getattr(dialog.entity, 'username', ''),
                    'type': 'channel' if dialog.is_channel else 'group',
                    'unread_count': dialog.unread_count
                })

        return channels

    except Exception as e:
        print(f"Error fetching user channels: {e}")
        return []


# Convenience function for synchronous usage
def fetch_messages_sync(channel_username: str, limit: int = 100, offset_hours: int = 24) -> List[Dict]:
    """
    Synchronous wrapper for fetch_messages

    Args:
        channel_username: Channel username
        limit: Maximum messages to fetch
        offset_hours: Fetch messages from last N hours

    Returns:
        List of message dictionaries
    """
    import asyncio

    async def _fetch():
        offset_date = datetime.utcnow() - timedelta(hours=offset_hours) if offset_hours > 0 else None
        return await fetch_messages(channel_username, limit=limit, offset_date=offset_date)

    try:
        # Create new event loop if none exists
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        return loop.run_until_complete(_fetch())
    except Exception as e:
        print(f"Error in sync fetch: {e}")
        return []


# Testing function
async def test_client():
    """Test Telegram client connection and fetch sample messages"""
    try:
        await init_client()
        print("Successfully connected to Telegram!")

        # Get user info
        me = await client.get_me()
        print(f"Logged in as: {me.first_name} (@{me.username})")

        # Get channels
        channels = await get_user_channels()
        print(f"\nYou are a member of {len(channels)} channels:")
        for ch in channels[:10]:  # Show first 10
            print(f"  - {ch['title']} (@{ch['username'] or 'no-username'})")

    except Exception as e:
        print(f"Test failed: {e}")
    finally:
        await disconnect_client()


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_client())
