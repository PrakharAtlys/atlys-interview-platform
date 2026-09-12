import 'dotenv/config'
import { nanoid } from 'nanoid'
import { prisma } from './db'

const CHALLENGES = [
  {
    slug: 'leaky-login',
    title: 'The Leaky Login Page',
    description: "Log in as admin. You don't have the password — figure it out.",
    type: 'web_app',
    expectedAnswerRegex: 'atlys_ka_password_kya_hai',
    order: 1,
  },
  {
    slug: 'base64-config',
    title: 'The Base64 "Encrypted" Config',
    description: "This secret is 'encrypted.' Decode it and tell us what it says.",
    type: 'web_app',
    expectedAnswerRegex: 'moneyfollowsmybrothermoneyfollows',
    order: 2,
  },
  {
    slug: 'decode-token',
    title: 'Decode the Token',
    description:
      "You're logged in as a guest. Find out what information this login token is actually carrying about you.",
    type: 'web_app',
    expectedAnswerRegex: 'guest',
    order: 3,
  },
  {
    slug: 'exif-hint',
    title: 'The Picture That Says More Than It Shows',
    description: "There's a hint hidden inside this image file — not in the picture itself.",
    type: 'downloadable_artifact',
    expectedAnswerRegex: 'secret-role',
    order: 4,
  },
  {
    slug: 'lazy-password',
    title: 'The Lazy Password',
    description:
      "We forgot the password to this zip file. It's definitely something lazy — can you get in?",
    type: 'downloadable_artifact',
    expectedAnswerRegex: 'password123',
    order: 5,
  },
  {
    slug: 'git-history-ghost',
    title: 'The Git History Ghost',
    description:
      "This repo's current code looks clean. The team swears a real key was never actually removed properly. Prove them right or wrong.",
    type: 'repo',
    expectedAnswerRegex: 'atlys_live_key_7788',
    order: 6,
  },
  {
    slug: 'chatbot-secret',
    title: 'Make the Chatbot Talk',
    description: 'This chatbot has been told to keep a secret. Get it to tell you the secret code.',
    type: 'llm',
    expectedAnswerRegex: 'FLY50',
    order: 7,
  },
  {
    slug: 'poisoned-doc',
    title: 'The Poisoned Document',
    description:
      'Ask the assistant a normal question about the document. See what happens — then figure out why.',
    type: 'llm',
    expectedAnswerRegex: null,
    order: 8,
  },
]

async function main() {
  const challenges = []
  for (const c of CHALLENGES) {
    challenges.push(
      await prisma.challenge.upsert({
        where: { slug: c.slug },
        update: c,
        create: c,
      }),
    )
  }

  const candidate = await prisma.candidate.upsert({
    where: { id: 'seed-candidate-1' },
    update: {},
    create: { id: 'seed-candidate-1', name: 'Jordan Rivera', email: 'jordan@example.com' },
  })

  const inviteToken = nanoid(10)
  const session = await prisma.session.create({
    data: { candidateId: candidate.id, inviteToken },
  })

  console.log('Seeded challenges:', challenges.map((c) => c.slug).join(', '))
  console.log('Seeded candidate:', candidate.email)
  console.log('Invite link: http://localhost:5183/?token=' + inviteToken)
  console.log('Session id:', session.id)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
