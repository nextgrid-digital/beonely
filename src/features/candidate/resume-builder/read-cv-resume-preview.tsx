import {
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  PROFILE_AVATAR_PLACEHOLDER_URL,
  type ResumeContentItem,
  type ResumeSection,
  type ResumeStructuredV1,
} from '@/lib/candidate/resume-structured-schema'
import { SERVICENOW_JOB_MODULES } from '@/lib/jobs/servicenow-job-taxonomy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ResumeCertificatesSection } from './resume-certificates-section'
import { ResumeChipSection } from './resume-chip-section'
import { ResumeRichTextField } from './resume-rich-text-field'

function isHttpHref(href: string): boolean {
  return /^https?:\/\//i.test(href.trim())
}

function ExternalArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      width='12'
      height='12'
      viewBox='0 0 12 12'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      aria-hidden
    >
      <path
        d='M3.5 3C3.22386 3 3 3.22386 3 3.5C3 3.77614 3.22386 4 3.5 4V3ZM8.5 3.5H9C9 3.22386 8.77614 3 8.5 3V3.5ZM8 8.5C8 8.77614 8.22386 9 8.5 9C8.77614 9 9 8.77614 9 8.5H8ZM2.64645 8.64645C2.45118 8.84171 2.45118 9.15829 2.64645 9.35355C2.84171 9.54882 3.15829 9.54882 3.35355 9.35355L2.64645 8.64645ZM3.5 4H8.5V3H3.5V4ZM8 3.5V8.5H9V3.5H8ZM8.14645 3.14645L2.64645 8.64645L3.35355 9.35355L8.85355 3.85355L8.14645 3.14645Z'
        className='fill-current text-slate-900'
      />
    </svg>
  )
}

function ProfileHeaderAvatar({
  avatarUrl,
  name,
}: {
  avatarUrl: string
  name: string
}) {
  const [broken, setBroken] = useState(false)
  return (
    <img
      alt={name}
      src={broken ? PROFILE_AVATAR_PLACEHOLDER_URL : avatarUrl}
      width={144}
      height={144}
      className='size-28 rounded-full object-cover md:size-36'
      onError={() => setBroken(true)}
    />
  )
}

const INLINE =
  'border-0 bg-transparent p-0 shadow-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-0 w-full min-w-0 rounded-sm placeholder:text-slate-400'

const emptyItem = (): ResumeContentItem => ({
  title: '',
  company: '',
  location: '',
  college: '',
  state: '',
  country: '',
  subTitle: '',
  date: '',
  description: '',
  fileUrl: '',
})

function isEducationSection(section: ResumeSection): boolean {
  return section.title.trim().toLowerCase() === 'education'
}

function isChipSection(section: ResumeSection): boolean {
  return section.title.trim().toLowerCase().includes('module')
}

function isCertificateSection(section: ResumeSection): boolean {
  return section.title.trim().toLowerCase().includes('certificat')
}

function isSkillsSection(section: ResumeSection): boolean {
  const t = section.title.trim().toLowerCase()
  return t.includes('skill') || t.includes('proficien')
}

function chipSuggestionsFor(section: ResumeSection): readonly string[] {
  if (section.title.trim().toLowerCase().includes('module')) {
    return SERVICENOW_JOB_MODULES
  }
  return []
}

function educationMetaLine(item: ResumeContentItem): string | null {
  const modern = [item.college, item.state, item.country]
    .map((s) => s.trim())
    .filter(Boolean)
  if (modern.length > 0) return modern.join(', ')
  const legacy = [item.company, item.location]
    .map((s) => s.trim())
    .filter(Boolean)
  if (legacy.length > 0) return legacy.join(', ')
  const st = item.subTitle.trim()
  return st || null
}

function sectionDisplayLabel(section: ResumeSection): string {
  const t = section.title.trim().toLowerCase()
  if (t.includes('skill') || t.includes('proficien')) return 'Tools'
  if (t.includes('work')) return 'Experience'
  if (t.includes('course')) return 'Courses'
  return section.title
}

function skillPillsFromSection(section: ResumeSection): string[] {
  const tokens = new Set<string>()
  for (const item of section.items) {
    const fromTitle = item.title
      .split(/,|\n|•/)
      .map((part) => part.trim())
      .filter(Boolean)
    const fromDescription = item.description
      .replace(/<[^>]+>/g, '\n')
      .split(/,|\n|•/)
      .map((part) => part.trim())
      .filter(Boolean)
    for (const token of [...fromTitle, ...fromDescription]) {
      if (token.length > 1) tokens.add(token)
    }
  }
  return [...tokens]
}

type SectionBlockProps = {
  section: ResumeSection
  sectionIndex: number
  mode: 'view' | 'edit'
  onDraftChange?: Dispatch<SetStateAction<ResumeStructuredV1>>
  onUploadCertificate?: (file: File) => Promise<string>
}

function ReadCvContentSection({
  section,
  sectionIndex,
  mode,
  onDraftChange,
  onUploadCertificate,
}: SectionBlockProps) {
  const edit = mode === 'edit' && onDraftChange
  const isEducation = isEducationSection(section)
  const isChips = isChipSection(section)
  const isCertificates = isCertificateSection(section)
  const isSkills = isSkillsSection(section)

  if (!edit && isChips && section.items.every((i) => !i.title.trim())) {
    return null
  }
  if (
    !edit &&
    isCertificates &&
    section.items.every((i) => !i.title.trim() && !i.fileUrl.trim())
  ) {
    return null
  }

  if (!edit && isSkills) {
    const pills = skillPillsFromSection(section)
    if (pills.length === 0) return null
    return (
      <section className='my-16 text-slate-900'>
        <div className='mb-6 border-b border-slate-200 pb-3'>
          <h3 className='text-[13px] font-medium tracking-[0.14em] uppercase text-slate-900'>
            {sectionDisplayLabel(section)}
          </h3>
        </div>
        <div className='flex flex-wrap gap-3'>
          {pills.map((pill) => (
            <span
              key={pill}
              className='inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-[15px] font-medium text-slate-700'
            >
              {pill}
            </span>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className='group/section my-16 text-slate-900'>
      <div className='mb-6 border-b border-slate-200 pb-3'>
        <div className='flex items-start justify-between gap-2'>
          {edit ? (
            <Input
              aria-label='Section title'
              value={section.title}
              onChange={(e) => {
                const v = e.target.value
                onDraftChange((d) => {
                  const sections = [...d.sections]
                  sections[sectionIndex] = { ...sections[sectionIndex], title: v }
                  return { ...d, sections }
                })
              }}
              className={`${INLINE} mb-0 text-[13px] font-medium tracking-[0.14em] uppercase text-slate-900`}
            />
          ) : (
            <h3 className='text-[13px] font-medium tracking-[0.14em] uppercase text-slate-900'>
              {sectionDisplayLabel(section)}
            </h3>
          )}
          {edit ? (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='shrink-0 text-destructive opacity-0 transition-opacity group-hover/section:opacity-100'
              aria-label='Remove section'
              onClick={() =>
                onDraftChange((d) => ({
                  ...d,
                  sections: d.sections.filter((_, j) => j !== sectionIndex),
                }))
              }
            >
              <Trash2 className='size-4' />
            </Button>
          ) : null}
        </div>
      </div>
      {isCertificates ? (
        <ResumeCertificatesSection
          items={section.items}
          sectionIndex={sectionIndex}
          mode={mode}
          onDraftChange={onDraftChange}
          onUpload={onUploadCertificate}
        />
      ) : isChips ? (
        <ResumeChipSection
          items={section.items}
          sectionIndex={sectionIndex}
          suggestions={chipSuggestionsFor(section)}
          mode={mode}
          onDraftChange={onDraftChange}
        />
      ) : (
        <div className='flex flex-col gap-12'>
          {section.items.map((item, itemIndex) => (
            <div
              className='group/item grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8'
              key={itemIndex}
            >
              <div className='text-[18px] leading-tight text-slate-400'>
                {edit ? (
                  <Input
                    aria-label='Date range'
                    placeholder='Date'
                    value={item.date}
                    onChange={(e) => {
                      const v = e.target.value
                      onDraftChange((d) => {
                        const sections = [...d.sections]
                        const items = [...sections[sectionIndex].items]
                        items[itemIndex] = { ...items[itemIndex], date: v }
                        sections[sectionIndex] = {
                          ...sections[sectionIndex],
                          items,
                        }
                        return { ...d, sections }
                      })
                    }}
                    className={`${INLINE} text-[18px] text-slate-400`}
                  />
                ) : (
                  item.date || ''
                )}
              </div>
              <div className='min-w-0'>
                {edit ? (
                  <>
                    <Input
                      aria-label='Title'
                      placeholder='Title'
                      value={item.title}
                      onChange={(e) => {
                        const v = e.target.value
                        onDraftChange((d) => {
                          const sections = [...d.sections]
                          const items = [...sections[sectionIndex].items]
                          items[itemIndex] = { ...items[itemIndex], title: v }
                          sections[sectionIndex] = {
                            ...sections[sectionIndex],
                            items,
                          }
                          return { ...d, sections }
                        })
                      }}
                      className={`${INLINE} text-[18px] font-semibold text-slate-900`}
                    />
                    <div className='mt-2 flex flex-col gap-0'>
                      {isEducation ? (
                        <div className='flex min-w-0 flex-row flex-wrap items-center gap-x-2 text-[16px] text-slate-600'>
                          <Input
                            aria-label='College or university'
                            placeholder='College'
                            value={item.college}
                            onChange={(e) => {
                              const v = e.target.value
                              onDraftChange((d) => {
                                const sections = [...d.sections]
                                const items = [...sections[sectionIndex].items]
                                items[itemIndex] = {
                                  ...items[itemIndex],
                                  college: v,
                                }
                                sections[sectionIndex] = {
                                  ...sections[sectionIndex],
                                  items,
                                }
                                return { ...d, sections }
                              })
                            }}
                            className={`${INLINE} min-w-0 flex-1 basis-0 text-[16px] text-slate-600`}
                          />
                          <span className='shrink-0 text-slate-500' aria-hidden>
                            ,
                          </span>
                          <Input
                            aria-label='State or region'
                            placeholder='State'
                            value={item.state}
                            onChange={(e) => {
                              const v = e.target.value
                              onDraftChange((d) => {
                                const sections = [...d.sections]
                                const items = [...sections[sectionIndex].items]
                                items[itemIndex] = {
                                  ...items[itemIndex],
                                  state: v,
                                }
                                sections[sectionIndex] = {
                                  ...sections[sectionIndex],
                                  items,
                                }
                                return { ...d, sections }
                              })
                            }}
                            className={`${INLINE} min-w-0 flex-1 basis-0 text-[16px] text-slate-600`}
                          />
                          <span className='shrink-0 text-slate-500' aria-hidden>
                            ,
                          </span>
                          <Input
                            aria-label='Country'
                            placeholder='Country'
                            value={item.country}
                            onChange={(e) => {
                              const v = e.target.value
                              onDraftChange((d) => {
                                const sections = [...d.sections]
                                const items = [...sections[sectionIndex].items]
                                items[itemIndex] = {
                                  ...items[itemIndex],
                                  country: v,
                                }
                                sections[sectionIndex] = {
                                  ...sections[sectionIndex],
                                  items,
                                }
                                return { ...d, sections }
                              })
                            }}
                            className={`${INLINE} min-w-0 flex-1 basis-0 text-[16px] text-slate-600`}
                          />
                        </div>
                      ) : (
                        <div className='flex min-w-0 flex-row flex-wrap items-center gap-x-2 text-[16px] text-slate-700'>
                          <Input
                            aria-label='Company'
                            placeholder='Company'
                            value={item.company}
                            onChange={(e) => {
                              const v = e.target.value
                              onDraftChange((d) => {
                                const sections = [...d.sections]
                                const items = [...sections[sectionIndex].items]
                                items[itemIndex] = {
                                  ...items[itemIndex],
                                  company: v,
                                }
                                sections[sectionIndex] = {
                                  ...sections[sectionIndex],
                                  items,
                                }
                                return { ...d, sections }
                              })
                            }}
                            className={`${INLINE} min-w-0 flex-1 basis-0 text-[16px] text-slate-700`}
                          />
                          <span className='shrink-0 text-slate-500' aria-hidden>
                            |
                          </span>
                          <Input
                            aria-label='Location'
                            placeholder='City, region, or Remote'
                            value={item.location}
                            onChange={(e) => {
                              const v = e.target.value
                              onDraftChange((d) => {
                                const sections = [...d.sections]
                                const items = [...sections[sectionIndex].items]
                                items[itemIndex] = {
                                  ...items[itemIndex],
                                  location: v,
                                }
                                sections[sectionIndex] = {
                                  ...sections[sectionIndex],
                                  items,
                                }
                                return { ...d, sections }
                              })
                            }}
                            className={`${INLINE} min-w-0 flex-1 basis-0 text-[16px] text-slate-700`}
                          />
                        </div>
                      )}
                    </div>
                    {!isEducation ? (
                      <div className='mt-4'>
                        <ResumeRichTextField
                          value={item.description}
                          editable
                          onChange={(html) =>
                            onDraftChange((d) => {
                              const sections = [...d.sections]
                              const items = [...sections[sectionIndex].items]
                              items[itemIndex] = {
                                ...items[itemIndex],
                                description: html,
                              }
                              sections[sectionIndex] = {
                                ...sections[sectionIndex],
                                items,
                              }
                              return { ...d, sections }
                            })
                          }
                        />
                      </div>
                    ) : null}
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='mt-3 w-fit text-destructive opacity-0 group-hover/item:opacity-100'
                      onClick={() =>
                        onDraftChange((d) => {
                          const sections = [...d.sections]
                          const items = sections[sectionIndex].items.filter(
                            (_, j) => j !== itemIndex
                          )
                          sections[sectionIndex] = {
                            ...sections[sectionIndex],
                            items,
                          }
                          return { ...d, sections }
                        })
                      }
                    >
                      Remove entry
                    </Button>
                  </>
                ) : (
                  <>
                    {item.title ? (
                      <h4 className='text-[18px] font-semibold leading-tight text-slate-900'>
                        {item.title}
                      </h4>
                    ) : null}
                    {isEducation ? (
                      educationMetaLine(item) ? (
                        <p className='mt-2 text-[16px] leading-7 text-slate-700'>
                          {educationMetaLine(item)}
                        </p>
                      ) : null
                    ) : item.company.trim() ||
                      item.location.trim() ||
                      item.subTitle.trim() ? (
                      <div className='mt-2 text-[16px] leading-7 text-slate-700'>
                        {item.company.trim() || item.location.trim() ? (
                          <p className='m-0'>
                            {[item.company.trim(), item.location.trim()]
                              .filter(Boolean)
                              .join(' | ')}
                          </p>
                        ) : item.subTitle.trim() ? (
                          <p className='m-0'>{item.subTitle}</p>
                        ) : null}
                      </div>
                    ) : null}
                    {!isEducation && item.description?.trim() ? (
                      <div className='mt-4 text-[16px] leading-8 text-slate-500'>
                        <ResumeRichTextField
                          value={item.description}
                          editable={false}
                          onChange={() => {}}
                        />
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ))}
          {edit ? (
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='w-fit'
              onClick={() =>
                onDraftChange((d) => {
                  const sections = [...d.sections]
                  sections[sectionIndex] = {
                    ...sections[sectionIndex],
                    items: [...sections[sectionIndex].items, emptyItem()],
                  }
                  return { ...d, sections }
                })
              }
            >
              <Plus className='mr-1 size-4' />
              Add entry
            </Button>
          ) : null}
        </div>
      )}
    </section>
  )
}

export type ReadCvResumePreviewProps = {
  data: ResumeStructuredV1
  headerAvatarAction?: ReactNode
  headerAvatarInputId?: string
  mode?: 'view' | 'edit'
  onDraftChange?: Dispatch<SetStateAction<ResumeStructuredV1>>
  onUploadCertificate?: (file: File) => Promise<string>
  userEmail?: string
}

export function ReadCvResumePreview({
  data,
  headerAvatarAction,
  headerAvatarInputId,
  mode = 'view',
  onDraftChange,
  onUploadCertificate,
  userEmail = '',
}: ReadCvResumePreviewProps) {
  const { general, sections } = data
  const effectiveMode = mode === 'edit' && onDraftChange ? 'edit' : 'view'
  const edit = effectiveMode === 'edit'

  const websiteDisplay = general.website
    ? general.website.replace(/(^\w+:|^)\/\//, '').replace('www.', '')
    : ''

  return (
    <main
      className={`relative mx-auto min-h-0 max-w-[1100px] px-6 pb-16 pt-6 font-sans text-slate-900 sm:px-10 sm:pb-24 ${edit ? 'ring-2 ring-slate-200/80 ring-offset-4 ring-offset-white' : ''}`}
    >
      {edit ? (
        <p className='mb-6 text-center text-xs font-medium tracking-[0.2em] text-slate-400 uppercase'>
          Editing
        </p>
      ) : null}

      <section className='flex flex-col gap-6 md:flex-row md:items-center md:gap-9'>
        <div className='flex shrink-0 items-start'>
          <div className='group/avatar relative overflow-hidden rounded-full'>
            <ProfileHeaderAvatar
              key={general.avatar}
              avatarUrl={general.avatar}
              name={general.name}
            />
            {headerAvatarAction && headerAvatarInputId ? (
              <label
                htmlFor={headerAvatarInputId}
                className='absolute inset-0 flex cursor-pointer items-center justify-center bg-slate-900/50 opacity-0 transition-opacity group-focus-within/avatar:opacity-100 group-hover/avatar:opacity-100 motion-reduce:transition-none'
              >
                {headerAvatarAction}
              </label>
            ) : null}
          </div>
        </div>
        <div className='min-w-0 flex-1'>
          {edit && onDraftChange ? (
            <>
              <Input
                aria-label='Full name'
                value={general.name}
                onChange={(e) =>
                  onDraftChange((d) => ({
                    ...d,
                    general: { ...d.general, name: e.target.value },
                  }))
                }
                className={`${INLINE} mb-1 text-[2.25rem] leading-none font-semibold text-slate-900 sm:text-[2.75rem]`}
              />
              <Input
                aria-label='Professional title'
                value={general.jobTitle}
                onChange={(e) =>
                  onDraftChange((d) => ({
                    ...d,
                    general: { ...d.general, jobTitle: e.target.value },
                  }))
                }
                className={`${INLINE} text-[1.25rem] leading-tight text-slate-600 sm:text-[1.65rem]`}
              />
              <Input
                aria-label='Location'
                placeholder='City, region'
                value={general.location}
                onChange={(e) =>
                  onDraftChange((d) => ({
                    ...d,
                    general: { ...d.general, location: e.target.value },
                  }))
                }
                className={`${INLINE} mt-2 text-[16px] text-slate-500`}
              />
              {general.website.trim() ? (
                <span className='mt-2 block text-[15px] text-slate-500'>
                  <a
                    href={general.website}
                    {...(isHttpHref(general.website)
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                    className='hover:underline'
                  >
                    {websiteDisplay}
                  </a>
                </span>
              ) : null}
            </>
          ) : (
            <>
              <h1 className='text-[2.25rem] leading-none font-semibold text-slate-900 sm:text-[2.75rem]'>
                {general.name}
              </h1>
              <p className='mt-2 text-[1.25rem] leading-tight text-slate-600 sm:text-[1.65rem]'>
                {general.jobTitle}
              </p>
              {general.location.trim() ? (
                <p className='mt-2 text-[16px] text-slate-500'>{general.location}</p>
              ) : null}
              {general.website ? (
                <span className='mt-2 block text-[15px] text-slate-500'>
                  <a
                    href={general.website}
                    {...(isHttpHref(general.website)
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                    className='hover:underline'
                  >
                    {websiteDisplay}
                  </a>
                </span>
              ) : null}
            </>
          )}
        </div>
      </section>

      <section className='my-16 text-slate-900'>
        <div className='mb-6 border-b border-slate-200 pb-3'>
          <h3 className='text-[13px] font-medium tracking-[0.14em] uppercase text-slate-900'>
            About
          </h3>
        </div>
        {edit && onDraftChange ? (
          <ResumeRichTextField
            value={general.about}
            editable
            onChange={(html) =>
              onDraftChange((d) => ({
                ...d,
                general: { ...d.general, about: html },
              }))
            }
          />
        ) : (
          <div className='text-[18px] leading-9 text-slate-600'>
            <ResumeRichTextField
              value={general.about}
              editable={false}
              onChange={() => {}}
            />
          </div>
        )}
      </section>

      {sections.map((content, index) => (
        <ReadCvContentSection
          key={index}
          section={content}
          sectionIndex={index}
          mode={effectiveMode}
          onDraftChange={onDraftChange}
          onUploadCertificate={onUploadCertificate}
        />
      ))}

      {edit && onDraftChange ? (
        <div className='my-8 flex flex-wrap gap-2'>
          {!sections.some((s) =>
            s.title.trim().toLowerCase().includes('module')
          ) ? (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() =>
                onDraftChange((d) => ({
                  ...d,
                  sections: [...d.sections, { title: 'Modules', items: [] }],
                }))
              }
            >
              <Plus className='mr-1 size-4' />
              Add modules
            </Button>
          ) : null}
          {!sections.some((s) =>
            s.title.trim().toLowerCase().includes('certificat')
          ) ? (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() =>
                onDraftChange((d) => ({
                  ...d,
                  sections: [
                    ...d.sections,
                    { title: 'Certifications', items: [] },
                  ],
                }))
              }
            >
              <Plus className='mr-1 size-4' />
              Add certifications
            </Button>
          ) : null}
        </div>
      ) : null}

      <section className='my-16 text-slate-900'>
        <div className='mb-6 border-b border-slate-200 pb-3'>
          <div className='flex items-center justify-between gap-2'>
            <h3 className='text-[13px] font-medium tracking-[0.14em] uppercase text-slate-900'>
              Contact
            </h3>
            {edit && onDraftChange ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() =>
                  onDraftChange((d) => ({
                    ...d,
                    general: {
                      ...d.general,
                      contacts: [
                        ...d.general.contacts,
                        {
                          label: 'Link',
                          value: userEmail || 'you@example.com',
                          href: `mailto:${userEmail || 'you@example.com'}`,
                        },
                      ],
                    },
                  }))
                }
              >
                <Plus className='mr-1 size-4' />
                Add row
              </Button>
            ) : null}
          </div>
        </div>
        <div className='flex flex-col gap-8'>
          {general.contacts.map((contact, index) => {
            const external = isHttpHref(contact.href)
            if (edit && onDraftChange) {
              return (
                <div className='grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8' key={index}>
                  <Input
                    aria-label='Contact label'
                    placeholder='Label'
                    value={contact.label}
                    onChange={(e) => {
                      const v = e.target.value
                      onDraftChange((d) => {
                        const contacts = [...d.general.contacts]
                        contacts[index] = { ...contacts[index], label: v }
                        return { ...d, general: { ...d.general, contacts } }
                      })
                    }}
                    className={`${INLINE} text-[18px] text-slate-400`}
                  />
                  <div className='flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center'>
                    <Input
                      aria-label='Contact display text'
                      placeholder='Display text'
                      value={contact.value}
                      onChange={(e) => {
                        const v = e.target.value
                        onDraftChange((d) => {
                          const contacts = [...d.general.contacts]
                          contacts[index] = { ...contacts[index], value: v }
                          return { ...d, general: { ...d.general, contacts } }
                        })
                      }}
                      className={`${INLINE} min-w-0 flex-1 text-[18px] text-slate-900`}
                    />
                    <div className='flex flex-1 gap-2 sm:max-w-[55%]'>
                      <Input
                        aria-label='Contact link'
                        placeholder='https:// or mailto: or tel:'
                        value={contact.href}
                        onChange={(e) => {
                          const v = e.target.value
                          onDraftChange((d) => {
                            const contacts = [...d.general.contacts]
                            contacts[index] = { ...contacts[index], href: v }
                            return { ...d, general: { ...d.general, contacts } }
                          })
                        }}
                        className={`${INLINE} min-w-0 flex-1 font-mono text-xs`}
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='shrink-0 text-destructive'
                        aria-label='Remove contact row'
                        onClick={() =>
                          onDraftChange((d) => ({
                            ...d,
                            general: {
                              ...d.general,
                              contacts: d.general.contacts.filter(
                                (_, j) => j !== index
                              ),
                            },
                          }))
                        }
                      >
                        <Trash2 className='size-4' />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            }
            return (
              <div
                className='grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8'
                key={index}
              >
                <div className='text-[18px] leading-tight text-slate-400'>
                  {contact.label}
                </div>
                <div className='min-w-0'>
                  <a
                    href={contact.href}
                    {...(external
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                    className='inline-flex items-center gap-1 break-all text-[18px] font-medium text-slate-900 hover:underline'
                  >
                    {contact.value}
                    {external ? <ExternalArrowIcon /> : null}
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
