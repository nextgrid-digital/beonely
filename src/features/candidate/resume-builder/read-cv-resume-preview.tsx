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

/** External link arrow (from ibelick/nextjs-resume Contact row). */
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
      width={80}
      height={80}
      className='size-20 rounded-full object-cover'
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

/** Modules render as chip pickers; Certifications render as uploaded files. */
function isChipSection(section: ResumeSection): boolean {
  return section.title.trim().toLowerCase().includes('module')
}

function isCertificateSection(section: ResumeSection): boolean {
  return section.title.trim().toLowerCase().includes('certificat')
}

function chipSuggestionsFor(section: ResumeSection): readonly string[] {
  if (section.title.trim().toLowerCase().includes('module')) {
    return SERVICENOW_JOB_MODULES
  }
  return []
}

/** College, state, country — or legacy company/location/subTitle when newer fields are empty. */
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

  // Hide an empty chip/certificate section in view mode so the public page never
  // shows a bare "Modules"/"Certifications" heading with nothing underneath.
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

  return (
    <section className='group/section my-14 text-sm text-slate-900'>
      <div className='mb-6 flex items-start justify-between gap-2'>
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
            className={`${INLINE} mb-0 text-base font-medium`}
          />
        ) : (
          <h3 className='mb-0 font-medium'>{section.title}</h3>
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
      <div className='flex flex-col gap-6'>
        {section.items.map((item, itemIndex) => (
          <div className='group/item flex' key={itemIndex}>
            <div className='mr-8 w-full max-w-[100px] shrink-0 text-slate-400'>
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
                  className={`${INLINE} text-sm text-slate-400`}
                />
              ) : item.date ? (
                item.date
              ) : (
                ''
              )}
            </div>
            <div className='flex min-w-0 flex-1 flex-col'>
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
                    className={`${INLINE} font-medium`}
                  />
                  <div className='mt-0.5 flex flex-col gap-0'>
                    {isEducation ? (
                      <div className='flex min-w-0 flex-row flex-wrap items-center gap-x-2 text-sm text-slate-600'>
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
                          className={`${INLINE} min-w-0 flex-1 basis-0 text-sm text-slate-600`}
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
                          className={`${INLINE} min-w-0 flex-1 basis-0 text-sm text-slate-600`}
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
                          className={`${INLINE} min-w-0 flex-1 basis-0 text-sm text-slate-600`}
                        />
                      </div>
                    ) : (
                      <div className='flex min-w-0 flex-row flex-wrap items-center gap-x-2 text-sm text-slate-600'>
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
                          className={`${INLINE} min-w-0 flex-1 basis-0 text-sm text-slate-600`}
                        />
                        <span className='shrink-0 text-slate-500' aria-hidden>
                          ,
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
                          className={`${INLINE} min-w-0 flex-1 basis-0 text-sm text-slate-600`}
                        />
                      </div>
                    )}
                  </div>
                  {!isEducation ? (
                    <div className='mt-2'>
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
                    className='mt-1 w-fit text-destructive opacity-0 group-hover/item:opacity-100'
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
                    <h4 className='font-medium'>{item.title}</h4>
                  ) : null}
                  {isEducation ? (
                    educationMetaLine(item) ? (
                      <div className='mt-0.5 flex flex-col gap-0 text-sm text-slate-600'>
                        <p className='m-0'>{educationMetaLine(item)}</p>
                      </div>
                    ) : null
                  ) : item.company.trim() ||
                    item.location.trim() ||
                    item.subTitle.trim() ? (
                    <div className='mt-0.5 flex flex-col gap-0 text-sm text-slate-600'>
                      {item.company.trim() || item.location.trim() ? (
                        <p className='m-0'>
                          {[item.company.trim(), item.location.trim()]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      ) : item.subTitle.trim() ? (
                        <p className='m-0'>{item.subTitle}</p>
                      ) : null}
                    </div>
                  ) : null}
                  {!isEducation && item.description?.trim() ? (
                    <div className='mt-2'>
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
  /** Overlay content on the header avatar in edit mode (e.g. "Upload"). */
  headerAvatarAction?: ReactNode
  /** `id` of the hidden file input; enables clicking the full avatar overlay to pick a file. */
  headerAvatarInputId?: string
  mode?: 'view' | 'edit'
  onDraftChange?: Dispatch<SetStateAction<ResumeStructuredV1>>
  /** Uploads a certificate file (edit mode) and resolves to its public URL. */
  onUploadCertificate?: (file: File) => Promise<string>
  /** Used when adding a contact row in edit mode. */
  userEmail?: string
}

/**
 * Read.cv-inspired profile layout; same structure in view and edit (inline fields + rich text).
 */
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
      className={`relative mx-auto min-h-0 max-w-[800px] px-6 pb-12 font-sans font-light text-slate-900 sm:pb-16 ${edit ? 'ring-2 ring-slate-200/80 ring-offset-4 ring-offset-white' : ''}`}
    >
      {edit ? (
        <p className='mb-4 text-center text-xs font-medium tracking-widest text-slate-400 uppercase'>
          Editing
        </p>
      ) : null}
      <section className='flex items-start gap-4'>
        <div className='flex w-20 shrink-0 flex-col items-center self-start'>
          <div className='group/avatar relative size-20 shrink-0 overflow-hidden rounded-full'>
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
        <div className='min-w-0 flex-1 pt-0.5'>
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
                className={`${INLINE} mb-0.5 text-xl font-medium`}
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
                className={`${INLINE} text-sm text-slate-600`}
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
                className={`${INLINE} mt-0.5 text-sm text-slate-600`}
              />
              {general.website.trim() ? (
                <span className='mt-0.5 block text-sm text-slate-500'>
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
              <h1 className='mb-0.5 text-xl font-medium'>{general.name}</h1>
              <p className='text-sm text-slate-600'>{general.jobTitle}</p>
              {general.location.trim() ? (
                <p className='text-sm text-slate-600'>{general.location}</p>
              ) : null}
              {general.website ? (
                <span className='text-sm text-slate-500'>
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
      <section className='my-9 text-sm'>
        <h3 className='mb-1 font-medium'>Professional summary</h3>
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
          <div className='text-slate-600'>
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
      <section className='my-14 text-sm'>
        <div className='mb-6 flex items-center justify-between gap-2'>
          <h3 className='font-medium'>Contact</h3>
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
        <div className='flex flex-col gap-6'>
          {general.contacts.map((contact, index) => {
            const external = isHttpHref(contact.href)
            if (edit && onDraftChange) {
              return (
                <div className='flex flex-wrap items-start gap-2' key={index}>
                  <div className='mr-8 flex w-full max-w-[100px] shrink-0 flex-col gap-1'>
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
                      className={`${INLINE} text-sm text-slate-400`}
                    />
                  </div>
                  <div className='flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center'>
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
                      className={`${INLINE} min-w-0 flex-1 text-sm`}
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
              <div className='flex' key={index}>
                <div className='mr-8 w-full max-w-[100px] shrink-0 text-slate-400'>
                  {contact.label}
                </div>
                <div className='flex min-w-0 flex-1 flex-col'>
                  <a
                    href={contact.href}
                    {...(external
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                    className='inline-flex items-center gap-1 break-all hover:underline'
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
