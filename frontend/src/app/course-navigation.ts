export type CourseCycle = "primary" | "secondary";
export type CourseAvailability = "available" | "coming-soon";

export interface CourseNavigationItem {
  id: string;
  labelKey: string;
  cycle: CourseCycle;
  level: number;
  route: string;
  availability: CourseAvailability;
}

// Configuration unique des niveaux du primaire. Les routes, libellés et états
// restent ainsi cohérents entre la navigation, le routeur et les futures pages.
export const PRIMARY_COURSES: readonly CourseNavigationItem[] = [
  {
    id: "primary-1",
    labelKey: "courseNavigation.levels.primary1",
    cycle: "primary",
    level: 1,
    route: "/apprentissages/primaire/1/mathematiques",
    availability: "available",
  },
  {
    id: "primary-2",
    labelKey: "courseNavigation.levels.primary2",
    cycle: "primary",
    level: 2,
    route: "/apprentissages/primaire/2/mathematiques",
    availability: "available",
  },
  {
    id: "primary-3",
    labelKey: "courseNavigation.levels.primary3",
    cycle: "primary",
    level: 3,
    route: "/apprentissages/primaire/3/mathematiques",
    availability: "available",
  },
  {
    id: "primary-4",
    labelKey: "courseNavigation.levels.primary4",
    cycle: "primary",
    level: 4,
    route: "/apprentissages/primaire/4/mathematiques",
    availability: "coming-soon",
  },
  {
    id: "primary-5",
    labelKey: "courseNavigation.levels.primary5",
    cycle: "primary",
    level: 5,
    route: "/apprentissages/primaire/5/mathematiques",
    availability: "coming-soon",
  },
  {
    id: "primary-6",
    labelKey: "courseNavigation.levels.primary6",
    cycle: "primary",
    level: 6,
    route: "/apprentissages/primaire/6/mathematiques",
    availability: "coming-soon",
  },
];
