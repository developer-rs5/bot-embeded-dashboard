require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const path = require('path');

const app = express();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PORT = process.env.PORT || 3000;
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'blazetown123';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader === `Bearer ${DASHBOARD_PASSWORD}`) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// API Endpoints

// Get channels
app.get('/api/channels', authenticate, async (req, res) => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channels = (await guild.channels.fetch())
      .filter(ch => ch.isTextBased() && !ch.isThread() && ch.type === 0)
      .map(ch => ({
        id: ch.id,
        name: `#${ch.name}`
      }));
    
    res.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Send embed
app.post('/api/embeds', authenticate, async (req, res) => {
    try {
      const { channelId, embedData } = req.body;
      
      if (!channelId) {
        return res.status(400).json({ error: 'Channel ID is required' });
      }
  
      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }
  
      const embed = new EmbedBuilder();
      
      if (embedData.title) embed.setTitle(embedData.title);
      if (embedData.url) embed.setURL(embedData.url);
      if (embedData.description) embed.setDescription(embedData.description);
      if (embedData.color) embed.setColor(embedData.color);
      
      // Only set author if name exists and URLs are valid
      if (embedData.author?.name) {
        const authorOptions = {
          name: embedData.author.name
        };
        if (embedData.author.url && isValidUrl(embedData.author.url)) {
          authorOptions.url = embedData.author.url;
        }
        if (embedData.author.icon_url && isValidUrl(embedData.author.icon_url)) {
          authorOptions.iconURL = embedData.author.icon_url;
        }
        embed.setAuthor(authorOptions);
      }
      
      if (embedData.image?.url && isValidUrl(embedData.image.url)) {
        embed.setImage(embedData.image.url);
      }
      
      if (embedData.thumbnail?.url && isValidUrl(embedData.thumbnail.url)) {
        embed.setThumbnail(embedData.thumbnail.url);
      }
      
      // Only set footer if text exists and icon URL is valid
      if (embedData.footer?.text) {
        const footerOptions = {
          text: embedData.footer.text
        };
        if (embedData.footer.icon_url && isValidUrl(embedData.footer.icon_url)) {
          footerOptions.iconURL = embedData.footer.icon_url;
        }
        embed.setFooter(footerOptions);
      }
      
      if (embedData.fields?.length > 0) {
        embed.addFields(embedData.fields.map(field => ({
          name: field.name || '\u200b', // Use zero-width space if empty
          value: field.value || '\u200b',
          inline: field.inline || false
        })));
      }
  
      await channel.send({ embeds: [embed] });
      res.json({ success: true });
    } catch (error) {
      console.error('Error sending embed:', error);
      res.status(500).json({ error: 'Failed to send embed', details: error.message });
    }
  });
  
  // Helper function to validate URLs
  function isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

// Start the server and bot
client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Bot logged in as ${client.user.tag}`);
    });
  })
  .catch(err => {
    console.error('Failed to login:', err);
    process.exit(1);
  });